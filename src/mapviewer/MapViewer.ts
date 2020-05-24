import * as PIXI from "pixi.js";
import { Viewport } from "pixi-viewport";
import * as Honeycomb from 'honeycomb-grid'
import Stats from 'stats.js';
import Cull from 'pixi-cull';
import ndarray from "ndarray";
import SimplexNoise from 'simplex-noise';
import Alea from 'alea';
import { countBy, findIndex, find } from "lodash";
import { MultiDictionary } from 'typescript-collections';

// 32 pixels wide
// 28 pixels tall
// 2 pixels border on bottom
const HEX_WIDTH = 32;
const HEX_HEIGHT = 28;
const HEX_OFFSET_Y = 2;
const TEXTURE_HEIGHT = 48;
const TEXTURE_WIDTH = 32;

// settings
const WORLD_SIZE = 200;
const DRAW_TILE_IDS = false;

type Hex = {
  index: number,
}

type TilesetOptions = {
  columns: number,
  grid: {
    height: number,
    width: number,
  },
};

class Tileset {
  tileTextures: Map<number, PIXI.Texture>;

  constructor(
    private baseTexture: PIXI.BaseTexture,
    private options: TilesetOptions
  ) {
    this.tileTextures = new Map();
  }

  getTile(tileID: number) {
    if (this.tileTextures.has(tileID)) {
      return this.tileTextures.get(tileID);
    }

    const texture = new PIXI.Texture(this.baseTexture, new PIXI.Rectangle(
      (tileID % this.options.columns) * this.options.grid.width,
      (Math.floor(tileID / this.options.columns)) * this.options.grid.height,
      this.options.grid.width,
      this.options.grid.height,
    ));
    this.tileTextures.set(tileID, texture);

    return texture;
  }
}


function sortHexes(a: Honeycomb.Hex<Hex>, b: Honeycomb.Hex<Hex>) {
  if (a.r < b.r) {
    return -1;
  }
  if (a.r === b.r) {
    return 0;
  }
  return 1;
}

const Hex = Honeycomb.extendHex<Hex>({
  size: {
    width: HEX_WIDTH,
    height: HEX_HEIGHT,
  },
  orientation: 'flat'
} as any);

const Grid = Honeycomb.defineGrid(Hex);

enum TerrainType {
  NONE = 0,
  OCEAN = 1,
  LAND = 2,
}

const terrainTypeTitles = {
  [TerrainType.OCEAN]: 'Ocean',
  [TerrainType.LAND]: 'Land',
}

enum Direction {
  SE = 0,
  NE = 1,
  N = 2,
  NW = 3,
  SW = 4,
  S = 5,
}

const oddq_directions = [
  [[+1,  0], [+1, -1], [ 0, -1], 
   [-1, -1], [-1,  0], [ 0, +1]],
  [[+1, +1], [+1,  0], [ 0, -1], 
   [-1,  0], [-1, +1], [ 0, +1]],
]

function octaveNoise(
  noiseFunc: (x: number, y: number, z: number) => number,
  x: number,
  y: number,
  z: number,
  octaves: number,
  persistence: number,
) {
  let total = 0;
  let frequency = 1;
  let amplitude = 1;
  let maxValue = 0;  // Used for normalizing result to 0.0 - 1.0
  for(let i = 0; i < octaves; i++) {
    total += noiseFunc(x * frequency, y * frequency, z * frequency) * amplitude;
    maxValue += amplitude;
    amplitude *= persistence;
    frequency *= 2;
  }
  
  return total/maxValue;
}

class WorldMap {
  size: {
    width: number;
    height: number;
  }
  hexgrid: Honeycomb.Grid<Honeycomb.Hex<Hex>>;
  terrain: ndarray;
  heightmap: ndarray;
  tileIDs: ndarray;

  constructor(
    options: { size: number },
  ) {
    this.size = {
      width: options.size * 2,
      height: options.size,
    };
    this.hexgrid = Grid.rectangle({
      width: this.size.width,
      height: this.size.height
    });
    this.hexgrid
    const arraySize = Uint32Array.BYTES_PER_ELEMENT * this.size.width * this.size.height;
    const arrayDim = [this.size.width, this.size.height];
    const terrainBuffer = new SharedArrayBuffer(arraySize);
    this.terrain = ndarray(new Uint32Array(terrainBuffer), arrayDim);

    const heightBuffer = new SharedArrayBuffer(arraySize);
    this.heightmap = ndarray(new Uint32Array(heightBuffer), arrayDim);

    const tileIDBuffer = new SharedArrayBuffer(arraySize);
    this.tileIDs = ndarray(new Uint32Array(tileIDBuffer), arrayDim);
  }

  get tileIDStats() {
    const grouped = countBy(this.tileIDs.data);

    let tileIDNeighborsTerrain = {};

    Object.keys(grouped).forEach(tileID => {
      const firstHex = this.hexgrid.find(hex => this.tileIDs.get(hex.x, hex.y) === parseInt(tileID))
      if (!firstHex) {
        tileIDNeighborsTerrain[tileID] = null;
        return;
      }
      let data = {};
      this.hexgrid.neighborsOf(firstHex).forEach((hex, nindex) => {
        const direction = Direction[nindex];
        if (hex === undefined) {
          data[direction] = null;
        } else {
          const terrainType = this.terrain.data[hex.index];
          data[direction] = `${terrainType} - ${terrainTypeTitles[terrainType]}`;
        }
      });
      tileIDNeighborsTerrain[tileID] = data;
    });

    return {
      tileIDCounts: grouped,
      distinctTileIDs: Object.keys(grouped).length,
      tileIDNeighborsTerrain,
    };
  }

  getHexFromPoint(point: PIXI.Point) {
    return Grid.pointToHex(point.x, point.y);
  }

  getHexCoordinate(hex: Honeycomb.Hex<Hex>) {
    const long = ((hex.x / this.size.width) * 360) - 180;
    const lat = ((-hex.y / this.size.height) * 180) + 90;
    return { lat, long };
  }

  generateTerrain() {
    const seed = Math.random();
    const rng = Alea(seed);
    const noise = new SimplexNoise(rng);
    this.hexgrid.forEach((hex, index) => {
      hex.index = index;
      const { lat, long } = this.getHexCoordinate(hex);
      const inc = ((lat + 90) / 180) * Math.PI;
      const azi = ((long + 180) / 360) * (2 * Math.PI);
      const nx = 1 * Math.sin(inc) * Math.cos(azi);
      const ny = 1 * Math.sin(inc) * Math.sin(azi);
      const nz = 1 * Math.cos(inc);
      const raw = octaveNoise(noise.noise3D.bind(noise), nx, ny, nz, 5, 0.5);
      const value = (raw + 1) / 2;
      const height = value * 255;
      this.heightmap.set(hex.x, hex.y, height);
      if (height < 140) {
        this.terrain.set(hex.x, hex.y, TerrainType.OCEAN);
      } else {
        this.terrain.set(hex.x, hex.y, TerrainType.LAND);
      }
      this.calculateHexTile(hex);
    });
  }

  getHexNeighbor(x: number, y: number, direction: Direction) {
    const parity = x & 1
    const dir = oddq_directions[parity][direction]
    return [x + dir[0], y + dir[1]]
  }

  calculateHexTile(hex: Honeycomb.Hex<Hex>) {
    const { x, y } = hex;
    const terrain = this.terrain.get(x, y);
    const se_hex = this.getHexNeighbor(x, y, Direction.SE)
    const se_hex_terrain = this.terrain.get(se_hex[0], se_hex[1]);

    const ne_hex = this.getHexNeighbor(x, y, Direction.NE)
    const ne_hex_terrain = this.terrain.get(ne_hex[0], ne_hex[1]);

    const n_hex = this.getHexNeighbor(x, y, Direction.N)
    const n_hex_terrain = this.terrain.get(n_hex[0], n_hex[1]);

    const nw_hex = this.getHexNeighbor(x, y, Direction.NW)
    const nw_hex_terrain = this.terrain.get(nw_hex[0], nw_hex[1]);

    const sw_hex = this.getHexNeighbor(x, y, Direction.SW)
    const sw_hex_terrain = this.terrain.get(sw_hex[0], sw_hex[1]);

    const s_hex = this.getHexNeighbor(x, y, Direction.S)
    const s_hex_terrain = this.terrain.get(s_hex[0], s_hex[1]);

    const tileID = (
      ((2 ** Direction.SE) * (se_hex_terrain || 0)) +
      ((2 ** Direction.NE) * (ne_hex_terrain || 0)) +
      ((2 ** Direction.N) * (n_hex_terrain || 0)) +
      ((2 ** Direction.NW) * (nw_hex_terrain || 0)) +
      ((2 ** Direction.SW) * (sw_hex_terrain || 0)) +
      ((2 ** Direction.S) * (s_hex_terrain || 0)) +
      ((2 ** 6) * terrain)
    );

    this.tileIDs.set(x, y, tileID);
  }
}

const fontStyle = {
  font: { name: 'eightbitdragon', size: 16, },
  align: 'center'
};

class HexTilemap extends PIXI.Container {
  tilesetMap: Map<number, Tileset>;

  constructor(
    public worldMap: WorldMap,
    public viewport: Viewport,
    public resources: PIXI.IResourceDictionary,
    public fonts: Record<string, any>,
  ) {
    super();
    this.tilesetMap = new Map();
    
    this.draw();
    this.setupEvents();
  }

  private setupEvents() {
    this.interactive = true;
    this.on('click', event => {
      const worldPoint = this.viewport.toWorld(event.data.global);
      const hex = this.worldMap.getHexFromPoint(worldPoint);
      console.log({
        coordinate: this.worldMap.getHexCoordinate(hex.x, hex.y),
        tileID: this.worldMap.tileIDs.get(hex.x, hex.y),
      });
    })
  }

  public addTileset(index: number, tileset: Tileset) {
    this.tilesetMap.set(index, tileset);
  }

  private draw() {
    console.groupCollapsed('draw grid');
    console.time('draw');
    const tileset = new Tileset(this.resources.tilemap.texture.baseTexture, {
      columns: 8,
      grid: {
        height: 48,
        width: 32,
      },
    });
    const selection = tileset.getTile(24);
    const terrainTextures = {
      [TerrainType.NONE]: PIXI.Texture.WHITE,
      [TerrainType.LAND]: tileset.getTile(0),
      [TerrainType.OCEAN]: tileset.getTile(6),
    };

    const mapHexes = this.worldMap.hexgrid.sort(sortHexes);

    // const geo = new PIXI.GraphicsGeometry();
    let hexGraphics = new PIXI.Graphics();
    this.addChild(hexGraphics);

    const gridGraphics = new PIXI.Graphics();
    gridGraphics.alpha = 0;
    this.addChild(gridGraphics);

    console.log('worldMap', this.worldMap);

    let count = 0;
    mapHexes.forEach(hex => {
      const texture = terrainTextures[this.worldMap.terrain.get(hex.x, hex.y)];
      count++;
      if (count % 10000 === 0) {
        hexGraphics = new PIXI.Graphics();
        this.addChild(hexGraphics);
      }
      const point = hex.toPoint();
      const half = TEXTURE_HEIGHT - HEX_HEIGHT - HEX_OFFSET_Y;
      const matrix = new PIXI.Matrix();
      matrix.translate(point.x, point.y - (half));
      hexGraphics.beginTextureFill({
        texture,
        matrix,
        color: 0xFFFFFF,
      })
      hexGraphics.drawRect(
        point.x,
        point.y - (half),
        32,
        48,
      );
      hexGraphics.endFill();

      if (DRAW_TILE_IDS) {
        const center = hex.center();
        const tileID = this.worldMap.tileIDs.get(hex.x, hex.y);
        const text = new PIXI.BitmapText(tileID.toString(), {
          font: { name: 'Eight Bit Dragon', size: 8 },
          align: 'center'
        });
        text.x = point.x + center.x - (text.width / 2);
        text.y = point.y + center.y - (text.height / 2);
        this.addChild(text);
      }
    });

    console.timeEnd('draw');
    console.groupEnd();
  }
}

class MapViewer {
  app: PIXI.Application;
  viewport: Viewport;
  cull: any;

  constructor(element: HTMLElement) {
    PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST;
    this.app = new PIXI.Application({
      width: window.innerWidth,
      height: window.innerHeight,
      resolution: window.devicePixelRatio,
      antialias: false,
    });
    const app = this.app;
  
    element.appendChild(app.view);
  
    const stats = new Stats();
    stats.showPanel(0);
    document.body.appendChild( stats.dom );
  
    app.ticker.add(() => {
      stats.begin();
      app.renderer.render(app.stage);
      stats.end();
    }, PIXI.UPDATE_PRIORITY.LOW);
    this.setupViewport();
  }

  setupViewport() {
    // create viewport
    const viewport = new Viewport({
      screenWidth: window.innerWidth,
      screenHeight: window.innerHeight,
      interaction: this.app.renderer.plugins.interaction,
    });
  
    this.cull = new Cull.Simple({
      dirtyTest: false,
    });
  
    // add the viewport to the stage
    this.app.stage.addChild(viewport);
    console.log('viewport', viewport);
  
    // activate plugins
    viewport.drag().pinch().wheel().decelerate();
    this.viewport = viewport;
  }

  start(resources: PIXI.IResourceDictionary, fonts: Record<string, any>) {
    console.log('resources', resources);

    const map = new WorldMap({
      size: WORLD_SIZE
    });
    console.log('create map', map);

    console.log('setup terrain');
    console.time('setup terrain');

    map.generateTerrain();

    console.timeEnd('setup terrain');

    const tilemap = new HexTilemap(map, this.viewport, resources, fonts);
    console.log('tilemap', tilemap);
    this.viewport.addChild(tilemap);
  }

  destroy() {
    this.app.destroy();
  }
}

export function initGame(element: HTMLDivElement) {
  console.time('setup');
  const loader = new PIXI.Loader();
  loader.add('tilemap', require('../images/tilemap.png'));
  loader.add('fontPng', require('../assets/eightbitdragon_0.png'));
  const mapViewer = new MapViewer(element);
  loader.onError.add(error => console.error(error));
  loader.load(({ resources }) => {
    // load fone
    const parser = new DOMParser();
    let fontXMLRaw = require('raw-loader!../assets/eightbitdragon.fnt').default;
    const pageFile = require('file-loader!../assets/eightbitdragon_0.png')
    fontXMLRaw = fontXMLRaw.replace('eightbitdragon_0.png', pageFile);
    const fontXML = parser.parseFromString(fontXMLRaw, 'text/xml');
    const font = PIXI.BitmapText.registerFont(fontXML, {
      [pageFile]: resources.fontPng.texture,
    });
    console.log(font);

    console.timeEnd('setup');
    console.time('start');
    mapViewer.start(resources, { eightBitDragon: font });
    console.timeEnd('start');
  });
  return () => {
    if (mapViewer) {
      mapViewer.destroy();
    }
  };
}
