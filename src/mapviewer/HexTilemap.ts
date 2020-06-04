import * as PIXI from "pixi.js";
import { Viewport } from "pixi-viewport";
import * as Honeycomb from 'honeycomb-grid';
import { IHex, Hex, HEX_ADJUST_Y } from "./MapViewer";
import { TerrainType, terrainColors, terrainTypeTitles } from './constants';
import { Tileset } from "./Tileset";
import { WorldMap, WorldMapHex } from './WorldMap';
import { TerrainTileset } from './TerrainTileset';
import { WorldMapTiles } from './WorldMapTiles';
import 'pixi-tilemap';
import Cull from 'pixi-cull';


const CHUNK_WIDTH = 10;
const CHUNK_HEIGHT = 10;

export function sortHexes(a: WorldMapHex, b: WorldMapHex) {
  if (a.r < b.r) {
    return -1;
  }
  if (a.r === b.r) {
    return 0;
  }
  return 1;
}

const CHUNK_SIZE = 9;

class ChunkLayer extends PIXI.tilemap.CompositeRectTileLayer {
  constructor(public cx: number, public cy: number, textures: PIXI.Texture[], zIndex: number) {
    super(zIndex, textures);
  }
}

const getChunkForCoordinate = (x: number, y: number) => {
  const y2 = x % 2 + y * 2;
  const chunkY = y2 / CHUNK_HEIGHT | 0;
  const chunkX = (x + (y2 % CHUNK_HEIGHT)) / CHUNK_WIDTH | 0;
  return { chunkX, chunkY };
}

export class HexTilemap extends PIXI.Container {
  worldMapTiles: WorldMapTiles;
  tilesetMap: Map<number, Tileset>;
  farLayer: PIXI.Container;
  chunksLayer: PIXI.Container;
  selectionSprite: PIXI.Sprite;
  selectionHex: Honeycomb.Hex<IHex>;
  tilesets: Map<string, Tileset>;
  terrainTileset: TerrainTileset;

  atlasGraphics: Map<Honeycomb.Hex<IHex>, PIXI.Graphics>;
  chunkTileLayers: Map<string, PIXI.tilemap.CompositeRectTileLayer>;
  hexChunk: Map<string, string>;
  chunkHexes: Map<string, { x: number, y: number }[]>;
  cullChunks: any;

  constructor(
    public app: PIXI.Application,
    public worldMap: WorldMap,
    public viewport: Viewport,
    public resources: PIXI.IResourceDictionary,
    public fonts: Record<string, any>) {
    super();
    this.tilesetMap = new Map();
    this.farLayer = new PIXI.Container();
    this.chunksLayer = new PIXI.Container();
    this.farLayer.alpha = 0;
    this.addChild(this.chunksLayer);
    this.addChild(this.farLayer);

    this.worldMapTiles = new WorldMapTiles(this.worldMap);

    this.viewport.worldWidth = worldMap.hexgrid.pointWidth();
    this.viewport.worldHeight = worldMap.hexgrid.pointHeight();

    this.viewport.on('zoomed', (...args) => {
      if (this.viewport.scale.x < 0.1) {
        this.chunksLayer.alpha = 0;
        this.farLayer.alpha = 1;
      }
      else {
        this.chunksLayer.alpha = 1;
        this.farLayer.alpha = 0;
      }
    });

    const tileset = new Tileset(this.resources.tilemap.texture.baseTexture, {
      columns: 8,
      grid: {
        height: 48,
        width: 32,
      },
    });
    this.terrainTileset = TerrainTileset.fromJSON(
      this.resources.terrainPNG.texture.baseTexture,
      this.resources.terrainJSON.data,
    );
    console.log('terrainTileset', this.terrainTileset);
    this.tilesets = new Map();
    this.tilesets.set('main', tileset);
    const selectionTexture = tileset.getTile(24);
    this.selectionHex = null;
    this.atlasGraphics = new Map();

    const { width, height } = this.worldMap.size;
  
    this.chunkTileLayers = new Map();

    this.hexChunk = new Map();
    this.chunkHexes = new Map();

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x += 2) {
        const { chunkX, chunkY } = getChunkForCoordinate(x, y);
        const chunkKey = `${chunkX},${chunkY}`;
        if (!this.chunkHexes.has(chunkKey)) {
          this.chunkHexes.set(chunkKey, []);
        }
        this.chunkHexes.get(chunkKey).push({ x, y });
        this.hexChunk.set(`${x},${y}`, chunkKey);
      }

      for (let x = 1; x < width; x += 2) {
        const { chunkX, chunkY } = getChunkForCoordinate(x, y);
        const chunkKey = `${chunkX},${chunkY}`;
        if (!this.chunkHexes.has(chunkKey)) {
          this.chunkHexes.set(chunkKey, []);
        }
        this.chunkHexes.get(chunkKey).push({ x, y });
        this.hexChunk.set(`${x},${y}`, chunkKey);
      }
    }

    console.log('chunkTileLayers', this.chunkTileLayers);
    console.log('hexChunk', this.hexChunk);
    console.log('chunkHexes', this.chunkHexes);

    this.draw();

    this.cullChunks = new Cull.Simple({
      dirtyTest: false
    });
    this.cullChunks.addList(this.chunksLayer.children);
    (window as any).cull = this.cullChunks;
    const getCullBounds = () => {
      const bounds = this.viewport.getVisibleBounds()
      bounds.x -= 500;
      bounds.y -= 500;
      bounds.width += 500;
      bounds.height += 500;
      return bounds;
    }
    PIXI.Ticker.shared.add(() => {
      if (viewport.dirty) {
        this.cullChunks.cull(getCullBounds());
        viewport.dirty = false;
      }
    });

    // selection sprite
    this.selectionSprite = new PIXI.Sprite(selectionTexture);
    this.selectionSprite.zIndex = 1;
    this.addChild(this.selectionSprite);
    this.selectionSprite.alpha = 0;


    this.setupEvents();

    // draw when hexes are changed
    this.worldMapTiles.tileMaskUpdates$.subscribe(hexes => {
      this.updateHexes(hexes);
    });
  }

  private updateHexes(hexes: WorldMapHex[]) {
    console.log('Update hexes', hexes);

    const chunksToUpdate = new Set<string>();
    for (const hex of hexes) {
      chunksToUpdate.add(this.hexChunk.get(`${hex.x},${hex.y}`));
    }
    console.log(chunksToUpdate);
    for (const chunkKey of chunksToUpdate) {
      this.drawChunk(chunkKey);
    }
  }

  private setupEvents() {
    this.interactive = true;
    this.viewport.on('clicked', event => {
      const hex = this.worldMap.getHexFromPoint(event.world);
      if (hex) {
        const terrainType = this.worldMap.terrain.data[hex.index];
        console.log({
          hex,
          coordinate: this.worldMap.getHexCoordinate(hex),
          position: this.worldMap.getPointFromPosition(hex.x, hex.y),
          terrainType: terrainType,
          terrainTitle: terrainTypeTitles[terrainType],
          tileID: this.worldMapTiles.tileMasks.data[hex.index],
        });
        console.log(this.worldMap.debugNeighborTerrain(hex.x, hex.y));

        this.updateSelection(hex);
      }
    });

    // this.viewport.on('moved', () => {
    //   const topLeftHex = this.worldMap.getHexFromPoint(new PIXI.Point(this.viewport.left, this.viewport.top));
    //   const bottomRightHex = this.worldMap.getHexFromPoint(new PIXI.Point(this.viewport.right, this.viewport.bottom));
    //   console.log({
    //     topLeftHex,
    //     bottomRightHex,
    //   })
    // });
  }

  updateSelection(hex: Honeycomb.Hex<IHex>) {
    if (this.selectionHex && this.selectionHex.equals(hex)) {
      this.selectionHex = null;
      this.selectionSprite.alpha = 0;
      return;
    }
    const point = hex.toPoint();
    this.selectionHex = hex;
    this.selectionSprite.alpha = 1;
    this.selectionSprite.position.set(point.x, point.y - HEX_ADJUST_Y);
  }

  public addTileset(index: number, tileset: Tileset) {
    this.tilesetMap.set(index, tileset);
  }

  drawHex(hex: Honeycomb.Hex<IHex>) {
    const atlasGraphics = this.atlasGraphics.get(hex)
    const terrainType = this.worldMap.terrain.get(hex.x, hex.y);
    const mask = this.worldMapTiles.tileMasks.get(hex.x, hex.y);
    const texture = this.terrainTileset.getTextureFromTileMask(mask);
    const SCALE = 50;
    const point = hex.toPoint();
    // if (texture) {
    //   this.getHexTileset(hex).addFrame(texture, point.x, point.y - HEX_ADJUST_Y);
    // }

    const corners = hex.corners().map(corner => corner.add(point));
    const [firstCorner, ...otherCorners] = corners;
    atlasGraphics.beginFill(terrainColors[terrainType]);
    atlasGraphics.moveTo(firstCorner.x / SCALE, firstCorner.y / SCALE);
    otherCorners.forEach(({ x, y }) => atlasGraphics.lineTo(x / SCALE, y / SCALE));
    atlasGraphics.lineTo(firstCorner.x / SCALE, firstCorner.y / SCALE);
    atlasGraphics.endFill();

    if (!texture) {
      const center = hex.center();
      const tileID = this.worldMapTiles.tileMasks.get(hex.x, hex.y);
      const text = new PIXI.BitmapText(tileID.toString(), {
        font: { name: 'Eight Bit Dragon', size: 8 },
        align: 'center'
      });
      text.x = point.x + center.x - (text.width / 2);
      text.y = point.y + center.y - (text.height / 2);
      this.addChild(text);
    }
  }

  private drawChunk(chunkKey: string) {
    const layer = this.chunkTileLayers.get(chunkKey);
    const hexes = this.chunkHexes.get(chunkKey);
    const hexPosititions: [number, number][] = [];
    let minX = Infinity;
    let minY = Infinity;
    for (const hex of hexes) {
      const [ x, y ] = this.worldMap.getHexPosition(hex.x, hex.y);
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      hexPosititions.push([x, y]);
    }
    layer.position.set(minX, minY);

    hexes.forEach((hex, index) => {
      const mask = this.worldMapTiles.tileMasks.get(hex.x, hex.y);
      const texture = this.terrainTileset.getTextureFromTileMask(mask);
      if (texture) {
        const [ x, y ] = hexPosititions[index];
        layer.addFrame(texture, x - minX, y - HEX_ADJUST_Y - minY);
      }
    });
  }

  private draw() {
    console.groupCollapsed('draw grid');
    console.time('draw');
    const mapHexes = this.worldMap.hexgrid.sort(sortHexes);

    let atlasGraphics = new PIXI.Graphics();
    const SCALE = 50;
    atlasGraphics.scale.set(SCALE);
    this.farLayer.addChild(atlasGraphics);

    const gridGraphics = new PIXI.Graphics();
    gridGraphics.alpha = 0;
    this.addChild(gridGraphics);

    console.log('worldMap', this.worldMap);

    PIXI.tilemap.Constant.use32bitIndex = true;

    let count = 0;
    mapHexes.forEach(hex => {
      count++;
      if (count % 1000 === 0) {
        atlasGraphics = new PIXI.Graphics();
        atlasGraphics.scale.set(SCALE);
        this.farLayer.addChild(atlasGraphics);
      }
      this.atlasGraphics.set(hex, atlasGraphics);
      this.drawHex(hex);
    });

    console.timeEnd('draw');
    console.groupEnd();
    

    console.groupCollapsed('draw chunks');
    console.time('draw chunks');
    console.log(`Drawing ${this.chunkHexes.size} chunks`);
    for (const chunkKey of this.chunkHexes.keys()) {
      const tilemap = new PIXI.tilemap.CompositeRectTileLayer(0, [
        new PIXI.Texture(this.terrainTileset.baseTexture),
      ]);
      this.chunkTileLayers.set(chunkKey, tilemap);
      this.chunksLayer.addChild(tilemap);
      this.drawChunk(chunkKey);
    }
    console.timeEnd('draw chunks');
    console.groupEnd();
  }
}
