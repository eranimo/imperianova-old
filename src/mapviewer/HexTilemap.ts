import * as PIXI from "pixi.js";
import { Viewport } from "pixi-viewport";
import * as Honeycomb from 'honeycomb-grid';
import { IHex, Hex, HEX_ADJUST_Y } from "./MapViewer";
import { TerrainType, terrainColors, terrainTypeTitles, terrainTypes, Direction } from './constants';
import { Tileset } from "./Tileset";
import { WorldMap, WorldMapHex, Edge } from './WorldMap';
import { TerrainTileset } from './TerrainTileset';
import { WorldMapTiles } from './WorldMapTiles';
import 'pixi-tilemap';
import Cull from 'pixi-cull';
import { SectionalTileset } from './SectionalTileset';
import { MultiDictionary } from "typescript-collections";


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

const getChunkForCoordinate = (x: number, y: number) => {
  const y2 = x % 2 + y * 2;
  const chunkY = y2 / CHUNK_HEIGHT | 0;
  const chunkX = (x + (y2 % CHUNK_HEIGHT)) / CHUNK_WIDTH | 0;
  return { chunkX, chunkY };
}

function generateHex(app: PIXI.Application, color: number, tw: number, th: number) {
  let graphics = new PIXI.Graphics();
  graphics.beginFill(color, 1.0);
  graphics.moveTo(-tw, 0);
  graphics.lineTo(-tw / 2, -th);
  graphics.lineTo(tw / 2, -th);
  graphics.lineTo(tw, 0);
  graphics.lineTo(tw / 2, th);
  graphics.lineTo(-tw / 2, th);
  graphics.closePath();
  graphics.endFill();

  graphics.position.set(tw, th);
  
  let renderTexture = PIXI.RenderTexture.create({ width: tw * 2, height: th * 2 });
  app.renderer.render(graphics, renderTexture);

  return renderTexture;
}

export class HexTilemap extends PIXI.Container {
  worldMapTiles: WorldMapTiles;
  tilesetMap: Map<number, Tileset>;
  overlayLayer: PIXI.Container;
  chunksLayer: PIXI.Container;
  selectionSprite: PIXI.Sprite;
  selectionHex: Honeycomb.Hex<IHex>;
  tilesets: Map<string, Tileset>;
  terrainTileset: SectionalTileset;

  overlayGraphics: Map<Honeycomb.Hex<IHex>, PIXI.Graphics>;
  chunkTileLayers: Map<string, PIXI.tilemap.CompositeRectTileLayer[]>;
  hexChunk: Map<string, string>;
  chunkHexes: Map<string, { x: number, y: number }[]>;
  cullChunks: any;
  overlayTexture: PIXI.RenderTexture;
  selectionTexture: PIXI.Texture;
  gridTexture: PIXI.Texture;
  hexRiverEdges: MultiDictionary<WorldMapHex, Edge>;

  constructor(
    public app: PIXI.Application,
    public worldMap: WorldMap,
    public viewport: Viewport,
    public resources: PIXI.IResourceDictionary,
    public fonts: Record<string, any>) {
    super();
    this.tilesetMap = new Map();
    this.hexRiverEdges = new MultiDictionary();
    for (const riverEdges of worldMap.rivers) {
      for (const edge of riverEdges) {
        this.hexRiverEdges.setValue(edge.h1, edge);
      }
    }
    this.overlayLayer = new PIXI.Container();
    this.chunksLayer = new PIXI.Container();
    this.overlayLayer.alpha = 0.75;
    this.addChild(this.chunksLayer);
    this.addChild(this.overlayLayer);

    this.worldMapTiles = new WorldMapTiles(this.worldMap);

    this.viewport.worldWidth = worldMap.hexgrid.pointWidth();
    this.viewport.worldHeight = worldMap.hexgrid.pointHeight();

    const tileset = new Tileset(this.resources.uiPNG.texture.baseTexture, {
      columns: 8,
      grid: {
        height: 48,
        width: 32,
      },
    });
    this.terrainTileset = SectionalTileset.fromXML(
      this.resources.terrainPNG.texture.baseTexture,
      this.resources.terrainXML.data,
    );
    console.log('terrainTileset', this.terrainTileset);
    this.tilesets = new Map();
    this.tilesets.set('ui', tileset);
    this.selectionHex = null;
    this.overlayGraphics = new Map();

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

    console.log('hexChunk', this.hexChunk);
    console.log('chunkHexes', this.chunkHexes);

    this.overlayTexture = generateHex(this.app, 0xFAFAFA, 32 / 2, 32 / 2);

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
    this.selectionTexture = tileset.getTile(0);
    this.gridTexture = tileset.getTile(1);
    this.selectionSprite = new PIXI.Sprite(this.selectionTexture);
    this.selectionSprite.zIndex = 1;
    this.addChild(this.selectionSprite);
    this.selectionSprite.alpha = 0;


    this.setupEvents();

    // draw when hexes are changed
    this.worldMapTiles.tileMaskUpdates$.subscribe(hexes => {
      this.updateHexes(hexes);
    });

    this.draw();
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
          height: this.worldMap.heightmap.get(hex.x, hex.y),
          coordinate: this.worldMap.getHexCoordinate(hex),
          position: this.worldMap.getPointFromPosition(hex.x, hex.y),
          terrainType: terrainType,
          terrainTitle: terrainTypeTitles[terrainType],
          tileID: this.worldMapTiles.tileMasks.data[hex.index],
        });
        console.log(this.worldMap.debugNeighborTerrain(hex.x, hex.y));
        const mask = this.worldMapTiles.tileMasks.get(hex.x, hex.y);
        console.log(
          this.terrainTileset.hexTileSectionalTileCache.get(mask),
          this.terrainTileset.hexTileDebugInfo.get(mask),
          this.terrainTileset.hexTileErrors.get(mask),
        )

        this.updateSelection(hex);
      }
    });
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
    const point = this.worldMap.getHexPosition(hex.x, hex.y);

    const overlayGraphics = this.overlayGraphics.get(hex)
    const terrainType = this.worldMap.terrain.get(hex.x, hex.y);
    const SCALE = 50;
    const corners = hex.corners().map(corner => corner.add(point[0], point[1]));
    const [firstCorner, ...otherCorners] = corners;
    overlayGraphics.lineStyle(1 / 30, 0x000);
    overlayGraphics.beginFill(terrainColors[terrainType]);
    overlayGraphics.moveTo(firstCorner.x / SCALE, firstCorner.y / SCALE);
    otherCorners.forEach(({ x, y }) => overlayGraphics.lineTo(x / SCALE, y / SCALE));
    overlayGraphics.lineTo(firstCorner.x / SCALE, firstCorner.y / SCALE);
    overlayGraphics.endFill();

    if (this.hexRiverEdges.containsKey(hex)) {
      overlayGraphics.lineStyle(3 / 30, 0x0000FF);
      for (const riverEdge of this.hexRiverEdges.getValue(hex)) {
        // console.log('draw', riverEdge.p1);
        overlayGraphics.moveTo(riverEdge.p1.x / SCALE, riverEdge.p1.y / SCALE); 
        overlayGraphics.lineTo(riverEdge.p2.x / SCALE, riverEdge.p2.y / SCALE); 
      }
    }

    // const mask = this.worldMapTiles.tileMasks.get(hex.x, hex.y);
    // const texture = this.terrainTileset.getTextureFromTileMask(mask);
    // if (!texture) {
    //   const center = hex.center();
    //   const tileID = this.worldMapTiles.tileMasks.get(hex.x, hex.y);
    //   const text = new PIXI.BitmapText(tileID.toString(), {
    //     font: { name: 'Eight Bit Dragon', size: 8 },
    //     align: 'center'
    //   });
    //   text.x = point[0] + center.x - (text.width / 2);
    //   text.y = point[1] + center.y - (text.height / 2);
    //   this.addChild(text);
    // }
  }

  private drawChunk(chunkKey: string) {
    const [terrainLayer] = this.chunkTileLayers.get(chunkKey);
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
    terrainLayer.position.set(Math.round(minX), Math.round(minY));

    hexes.forEach((hex, index) => {
      const terrainType = this.worldMap.getTerrainForCoord(hex.x, hex.y);
      if (terrainType === TerrainType.MAP_EDGE) return;
      const textures = this.terrainTileset.getTile(
        this.worldMapTiles.tileMasks.get(hex.x, hex.y),
        terrainType,
        this.worldMap.getHexNeighborTerrain(hex.x, hex.y),
      );
      if (textures) {
        const [ x, y ] = hexPosititions[index];
        textures.forEach(texture => {
          if (texture) {
            terrainLayer.addFrame(
              texture,
              Math.round(x - minX),
              Math.round(y - HEX_ADJUST_Y - minY)
            );
          }
        });
      }
    });
  }

  private draw() {
    console.groupCollapsed('draw grid');
    console.time('draw');
    const mapHexes = this.worldMap.hexgrid; //.sort(sortHexes);

    let overlayGraphics = new PIXI.Graphics();
    const SCALE = 50;
    overlayGraphics.scale.set(SCALE);
    this.overlayLayer.addChild(overlayGraphics);

    const gridGraphics = new PIXI.Graphics();
    gridGraphics.alpha = 0;
    this.addChild(gridGraphics);

    console.log('worldMap', this.worldMap);

    PIXI.tilemap.Constant.use32bitIndex = true;

    let count = 0;
    mapHexes.forEach(hex => {
      count++;
      if (count % 1000 === 0) {
        overlayGraphics = new PIXI.Graphics();
        overlayGraphics.scale.set(SCALE);
        this.overlayLayer.addChild(overlayGraphics);
      }
      this.overlayGraphics.set(hex, overlayGraphics);
      this.drawHex(hex);
    });

    console.timeEnd('draw');
    console.groupEnd();
    

    console.groupCollapsed('draw chunks');
    console.time('draw chunks');
    console.log(`Drawing ${this.chunkHexes.size} chunks`);
    const bitmaps = [
      new PIXI.Texture(this.terrainTileset.baseTexture),
      new PIXI.Texture(this.selectionTexture.baseTexture),
    ];
    for (const chunkKey of this.chunkHexes.keys()) {
      const terrainLayer = new PIXI.tilemap.CompositeRectTileLayer(0, bitmaps);
      this.chunkTileLayers.set(chunkKey, [terrainLayer]);
      this.chunksLayer.addChild(terrainLayer);
      this.drawChunk(chunkKey);
    }
    console.timeEnd('draw chunks');
    console.groupEnd();
  }
}
