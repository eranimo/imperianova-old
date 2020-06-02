import * as PIXI from "pixi.js";
import { Viewport } from "pixi-viewport";
import * as Honeycomb from 'honeycomb-grid';
import { IHex, Hex, HEX_ADJUST_Y, sortHexes } from "./MapViewer";
import { TerrainType, terrainColors, terrainTypeTitles } from './constants';
import { Tileset } from "./Tileset";
import { WorldMap } from "./WorldMap";
import { TerrainTileset } from './TerrainTileset';
import { WorldMapTiles } from './WorldMapTiles';


export class HexTilemap extends PIXI.Container {
  worldMapTiles: WorldMapTiles;
  tilesetMap: Map<number, Tileset>;
  closeLayer: PIXI.Container;
  farLayer: PIXI.Container;
  selectionSprite: PIXI.Sprite;
  selectionHex: Honeycomb.Hex<IHex>;
  tilesets: Map<string, Tileset>;
  terrainTileset: TerrainTileset;

  hexGraphics: Map<Honeycomb.Hex<IHex>, PIXI.Graphics[]>;

  constructor(
    public worldMap: WorldMap,
    public viewport: Viewport,
    public resources: PIXI.IResourceDictionary,
    public fonts: Record<string, any>) {
    super();
    this.tilesetMap = new Map();
    this.closeLayer = new PIXI.Container();
    this.farLayer = new PIXI.Container();
    this.farLayer.alpha = 0;
    this.addChild(this.closeLayer, this.farLayer);

    this.worldMapTiles = new WorldMapTiles(this.worldMap);

    this.viewport.worldWidth = worldMap.hexgrid.pointWidth();
    this.viewport.worldHeight = worldMap.hexgrid.pointHeight();

    this.viewport.on('zoomed', (...args) => {
      if (this.viewport.scale.x < 0.1) {
        this.closeLayer.alpha = 0;
        this.farLayer.alpha = 1;
      }
      else {
        this.closeLayer.alpha = 1;
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
    this.selectionSprite = new PIXI.Sprite(selectionTexture);
    this.addChild(this.selectionSprite);
    this.selectionSprite.alpha = 0;

    this.hexGraphics = new Map();
    this.draw();
    this.setupEvents();

    this.worldMapTiles.tileMaskUpdates$.subscribe(hexes => {
      for (const hex of hexes) {
        this.drawHex(hex);
      }
    });
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
    const [hexGraphics, atlasGraphics] = this.hexGraphics.get(hex)
    const terrainType = this.worldMap.terrain.get(hex.x, hex.y);
    const mask = this.worldMapTiles.tileMasks.get(hex.x, hex.y);
    const texture = this.terrainTileset.getTextureFromTileMask(mask);
    const SCALE = 50;
    const point = hex.toPoint();
    if (texture) {
      const matrix = new PIXI.Matrix();
      matrix.translate(point.x, point.y - HEX_ADJUST_Y);
      hexGraphics.beginTextureFill({
        texture,
        matrix,
        color: 0xFFFFFF,
      });
      hexGraphics.drawRect(
        point.x,
        point.y - HEX_ADJUST_Y,
        32,
        48
      );
      hexGraphics.endFill();
    }

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

  private draw() {
    console.groupCollapsed('draw grid');
    console.time('draw');
    const mapHexes = this.worldMap.hexgrid.sort(sortHexes);

    let hexGraphics = new PIXI.Graphics();
    this.closeLayer.addChild(hexGraphics);

    let atlasGraphics = new PIXI.Graphics();
    const SCALE = 50;
    atlasGraphics.scale.set(SCALE);
    this.farLayer.addChild(atlasGraphics);

    const gridGraphics = new PIXI.Graphics();
    gridGraphics.alpha = 0;
    this.addChild(gridGraphics);

    console.log('worldMap', this.worldMap);

    let count = 0;
    mapHexes.forEach(hex => {
      count++;
      if (count % 10000 === 0) {
        hexGraphics = new PIXI.Graphics();
        this.closeLayer.addChild(hexGraphics);
      }
      if (count % 1000 === 0) {
        atlasGraphics = new PIXI.Graphics();
        atlasGraphics.scale.set(SCALE);
        this.farLayer.addChild(atlasGraphics);
      }
      this.hexGraphics.set(hex, [hexGraphics, atlasGraphics]);
      this.drawHex(hex);
    });

    console.timeEnd('draw');
    console.groupEnd();
  }
}
