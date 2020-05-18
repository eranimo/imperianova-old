import * as PIXI from "pixi.js";
import { Viewport } from "pixi-viewport";
import * as Honeycomb from 'honeycomb-grid'
import Stats from 'stats.js';
import Cull from 'pixi-cull';


const HEX_SIZE = 16;
const HEX_WIDTH = 2 * HEX_SIZE;
const HEX_HEIGHT = Math.sqrt(3) * HEX_SIZE;
const GRID_WIDTH = 5;
const GRID_HEIGHT = 5;

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
  // hack to turn it into its own Texture
  const sprite = new PIXI.Sprite(texture);
  const pixels = app.renderer.extract.pixels(sprite);
  console.log(pixels);
  const newTexture = PIXI.Texture.fromBuffer(pixels, options.grid.width, options.grid.height);
  return newTexture;
}

class Tilemap {
  private gridFactory: Honeycomb.GridFactory<Honeycomb.Hex<Hex>>;
  resources: PIXI.IResourceDictionary;

  constructor(
    protected app: PIXI.Application,
    protected viewport: Viewport,
    options: {
      resources: PIXI.IResourceDictionary
    }
  ) {
    const Hex = Honeycomb.extendHex<Hex>({
      size: HEX_SIZE,
      orientation: 'flat'
    } as any)
    this.gridFactory = Honeycomb.defineGrid(Hex)
    this.resources = options.resources;
  }

  createChunks() {
    console.groupCollapsed('draw grid');
    console.time('draw');
    const hexgrid = this.gridFactory.rectangle({
      width: GRID_WIDTH,
      height: GRID_HEIGHT,
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

    const hexGraphics = new PIXI.Graphics();
    hexGraphics.lineStyle(1, 0x999999);
    this.viewport.addChild(hexGraphics);

    const gridGraphics = new PIXI.Graphics();
    gridGraphics.lineStyle(1, 0x009999);
    this.viewport.addChild(gridGraphics);

    const matrix = new PIXI.Matrix();

    console.log('hexgrid', hexgrid);
    [
      hexgrid.get({ x: 0, y: 0 }),
      hexgrid.get({ x: 1, y: 0 }),
      hexgrid.get({ x: 0, y: 1 }),
      hexgrid.get({ x: 1, y: 1 }),
    ].forEach(hex => {
      const x = HEX_SIZE * 3/2 * hex.x;
      const y = HEX_SIZE * Math.sqrt(3) * (hex.y + 0.5 * (hex.x & 1))
      const half = (1/2) * HEX_HEIGHT;
      matrix.set(1, 0, 0, 1, 0, -(half + 4));
      hexGraphics.beginTextureFill({
        texture: grass,
        matrix,
        color: 0xFFFFFF,
        // alpha: 0.5,
      })
      // console.log(grass, hex, point);
      // console.log(x, y, matrix);
      hexGraphics.drawRect(
        x,
        y - (half + 4),
        32,
        48,
      );
      hexGraphics.endFill();
      
      const point = hex.toPoint();

      // add the hex's position to each of its corner points
      const corners = hex.corners().map(corner => corner.add(point))
      // separate the first from the other corners
      const [firstCorner, ...otherCorners] = corners

      // move the "pen" to the first corner
      gridGraphics.moveTo(firstCorner.x, firstCorner.y)
      // draw lines to the other corners
      otherCorners.forEach(({ x, y }) => gridGraphics.lineTo(x, y))
      // finish at the first corner
      gridGraphics.lineTo(firstCorner.x, firstCorner.y)
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
      worldWidth: HEX_SIZE * GRID_WIDTH,
      worldHeight: HEX_SIZE * GRID_HEIGHT,
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
    const layer = tilemap.createChunks();
    this.cull.addList(layer.children);
    this.cull.cull(this.viewport.getVisibleBounds());
    this.app.ticker.add(() => {
      if (this.viewport.dirty) {
        this.cull.cull(this.viewport.getVisibleBounds());
        this.viewport.dirty = false;
      }
    });
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
