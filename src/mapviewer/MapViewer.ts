import * as PIXI from "pixi.js";
import { Viewport } from "pixi-viewport";
import * as Honeycomb from 'honeycomb-grid'
import Stats from 'stats.js';
import Cull from 'pixi-cull';
import ndarray from "ndarray";


// 32 pixels wide
// 28 pixels tall
// 2 pixels border on bottom
const HEX_WIDTH = 32;
const HEX_HEIGHT = 28;
const HEX_OFFSET_Y = 2;
const TEXTURE_HEIGHT = 48;
const TEXTURE_WIDTH = 32;

type Hex = {
  size: number,
}

type Tileset = {
  texture: PIXI.BaseTexture,
  options: {
    columns: number,
    grid: {
      height: number,
      width: number,
    },
  }
};

function getTilesetImage(app: PIXI.Application, tileset: Tileset, index: number) {
  const { options } = tileset;
  const texture = new PIXI.Texture(tileset.texture, new PIXI.Rectangle(
    (index % options.columns) * options.grid.width,
    (Math.floor(index / options.columns)) * options.grid.height,
    options.grid.width,
    options.grid.height,
  ));
  return texture;
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



type MapOptions = {
  size: number
}

class Map {
  public width: number;
  public height: number;
  public sab: SharedArrayBuffer;
  public hexgrid: Honeycomb.Grid<Honeycomb.Hex<Hex>>;

  private data: ndarray<Uint32Array>;

  constructor(options: MapOptions) {
    this.width = options.size * 2;
    this.height = options.size;
    this.sab = new SharedArrayBuffer(Uint32Array.BYTES_PER_ELEMENT * this.width * this.height);
    this.data = ndarray(new Uint32Array(this.sab), [this.width, this.height]);
    this.hexgrid = Grid.rectangle({
      width: this.width,
      height: this.height
    });
  }

  setAll(tileID: number) {
    for (let x = 0; x < this.width; x++) {
      for (let y = 0; y < this.height; y++) {
        this.set(x, y, tileID);
      }
    }
  }

  set(x: number, y: number, tileID: number) {
    this.data.set(x, y, tileID);
  }
}

class Tilemap {
  resources: PIXI.IResourceDictionary;

  constructor(
    protected app: PIXI.Application,
    protected viewport: Viewport,
    options: {
      resources: PIXI.IResourceDictionary
    }
  ) {
    this.resources = options.resources;
  }

  createMap() {
    console.groupCollapsed('draw grid');
    console.time('draw');
    const map = new Map({
      size: 75
    });
    const tileset: Tileset = {
      texture: this.resources.tilemap.texture.baseTexture,
      options: {
        columns: 8,
        grid: {
          height: 48,
          width: 32,
        },
      }
    };
    const grass = getTilesetImage(this.app, tileset, 1);
    const selection = getTilesetImage(this.app, tileset, 24);
    console.log(grass);

    const mapHexes = map.hexgrid.sort(sortHexes);

    const hexGraphics = new PIXI.Graphics();
    this.viewport.addChild(hexGraphics);

    const gridGraphics = new PIXI.Graphics();
    gridGraphics.alpha = 0;
    this.viewport.addChild(gridGraphics);

    console.log('map', map);
    mapHexes.forEach(hex => {
      const point = hex.toPoint();
      const half = TEXTURE_HEIGHT - HEX_HEIGHT - HEX_OFFSET_Y;
      const matrix = new PIXI.Matrix();
      matrix.translate(point.x, point.y - (half));
      hexGraphics.beginTextureFill({
        texture: grass,
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
    });

    console.timeEnd('draw');
    console.groupEnd();
    return hexGraphics;
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
  
    // create viewport
    const viewport = new Viewport({
      screenWidth: window.innerWidth,
      screenHeight: window.innerHeight,
      interaction: app.renderer.plugins.interaction,
    });
  
    this.cull = new Cull.Simple({
      dirtyTest: false,
    });
  
    // add the viewport to the stage
    app.stage.addChild(viewport);
    console.log('viewport', viewport);
  
    // activate plugins
    viewport.drag().pinch().wheel().decelerate();
    this.viewport = viewport;
  }

  start(resources: PIXI.IResourceDictionary) {
    const tilemap = new Tilemap(this.app, this.viewport, {
      resources
    });
    const layer = tilemap.createMap();
    // this.cull.addList(layer.children);
    // this.cull.cull(this.viewport.getVisibleBounds());
    // this.app.ticker.add(() => {
    //   if (this.viewport.dirty) {
    //     this.cull.cull(this.viewport.getVisibleBounds());
    //     this.viewport.dirty = false;
    //   }
    // });
    console.log('resources', resources);
  }

  destroy() {
    this.app.destroy();
  }
}

export function initGame(element: HTMLDivElement) {
  console.time('setup');
  const loader = new PIXI.Loader();
  loader.add('tilemap', require('../images/tilemap.png'));
  const mapViewer = new MapViewer(element);
  loader.load(({ resources }) => {
    console.timeEnd('setup');
    mapViewer.start(resources);
  });
  return () => {
    if (mapViewer) {
      mapViewer.destroy();
    }
  };
}
