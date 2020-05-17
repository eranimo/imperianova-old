import * as PIXI from "pixi.js-legacy";
import { Viewport } from "pixi-viewport";
import * as Honeycomb from 'honeycomb-grid'
import Stats from 'stats.js';
import Cull from 'pixi-cull';


const HEX_SIZE = 32;
const HEX_WIDTH = Math.sqrt(3) * HEX_SIZE;
const HEX_HEIGHT = 2 * HEX_SIZE;
const GRID_WIDTH = 100;
const GRID_HEIGHT = 100;
const CHUNK_SIZE = 10;
const GRID_CHUNK_WIDTH = GRID_WIDTH / CHUNK_SIZE;
const GRID_CHUNK_HEIGHT = GRID_HEIGHT / CHUNK_SIZE;
const CHUNK_WIDTH = (HEX_WIDTH * CHUNK_SIZE) + (HEX_WIDTH / 2);
const CHUNK_HEIGHT = (HEX_HEIGHT * CHUNK_SIZE) - HEX_HEIGHT;

// debug
const DEBUG_CHUNK_GRID = false;

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

function getTilesetImage(tileset: Tileset, index: number) {
  const { options } = tileset;
  const texture = new PIXI.Texture(tileset.texture, new PIXI.Rectangle(
    (index % options.columns) * options.grid.width,
    (Math.floor(index / options.columns)) * options.grid.height,
    options.grid.width,
    options.grid.height,
  ));
  return texture;
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
    })
    this.gridFactory = Honeycomb.defineGrid(Hex)
    this.resources = options.resources;
    this.createChunks();
  }

  createChunks() {
    console.groupCollapsed('draw grid');
    console.time('chunks draw');
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
    const grass = getTilesetImage(tileset, 1);
    console.log(grass);

    const chunksContainer = new PIXI.Container();
    chunksContainer.sortableChildren = true;
    this.viewport.addChild(chunksContainer);

    let chunkHexes;
    for (let cx = 0; cx < GRID_CHUNK_WIDTH; cx++) {
      for (let cy = 0; cy < GRID_CHUNK_HEIGHT; cy++) {
        chunkHexes = [];
        console.groupCollapsed(`Drawing chunk (${cx}, ${cy})`);
        console.time('get hexes in chunk');
        // const firstHexIndex = hexgrid.indexOf(hexgrid.get({
        //   x: cx * CHUNK_SIZE,
        //   y: cy * CHUNK_SIZE,
        // }));
        const firstHexIndex = (cx * CHUNK_SIZE) + GRID_WIDTH * (cy * CHUNK_SIZE);
        for (let hx = 0; hx < CHUNK_SIZE; hx++) {
          const index = firstHexIndex + (hx * GRID_WIDTH);
          for (let hy = 0; hy < CHUNK_SIZE; hy++) {
            chunkHexes.push(hexgrid[index + hy])
          }
        }
        console.timeEnd('get hexes in chunk');
        const chunkContainer = new PIXI.Container();
        chunkContainer.sortableChildren = true;
        chunkContainer.zIndex = (cx) * 1000;
        chunkContainer.position.set(
          CHUNK_WIDTH * cx - ((HEX_WIDTH / 2) * cx),
          CHUNK_HEIGHT * cy - (1/4 * HEX_HEIGHT * cy),
        );
        const graphics = new PIXI.Graphics();
        graphics.lineStyle(1, 0x999999);
        console.time('chunk draw');
        chunkHexes.forEach(hex => {
          const point = hex.toPoint() as PIXI.Point;
          point.x -= chunkContainer.position.x;
          point.y -= chunkContainer.position.y;
          const hexSprite = new PIXI.Sprite();
          hexSprite.scale = new PIXI.Point(2, 2);
          hexSprite.position = point;
          hexSprite.position.y -= (24 * 2);
          hexSprite.position.y += 8;
          hexSprite.texture = grass;
          hexSprite.zIndex = hex.toPoint().y;
          chunkContainer.addChild(hexSprite);

          const [firstCorner, ...otherCorners] = hex.corners().map(corner => corner.add(point));

          // graphics.beginFill(0x333333);
          graphics.moveTo(firstCorner.x, firstCorner.y);
          otherCorners.forEach(({ x, y }) => graphics.lineTo(x, y))
          graphics.lineTo(firstCorner.x, firstCorner.y);
          // graphics.endFill();
        });

        if (DEBUG_CHUNK_GRID) {
          graphics.lineStyle(1, 0x009999);
          graphics.moveTo(0, 0);
          graphics.lineTo(0, CHUNK_HEIGHT);
          graphics.lineTo(CHUNK_WIDTH, CHUNK_HEIGHT);
          graphics.lineTo(CHUNK_WIDTH, 0);
          graphics.lineTo(0, 0);
        }
        // chunkContainer.addChild(graphics);
        chunksContainer.addChild(chunkContainer);
        console.timeEnd('chunk draw');
        console.groupEnd();
      }
    }
    console.timeEnd('chunks draw');
    console.groupEnd();
  }
}
class MapViewer {
  app: PIXI.Application;
  viewport: Viewport;

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
  
    // const cull = new Cull.SpatialHash({
    //   xSize: CHUNK_WIDTH,
    //   ySize: CHUNK_HEIGHT,
    // });
    // cull.addContainer(viewport);
    // cull.cull(viewport.getVisibleBounds());
    // app.ticker.add(() => {
    //   if (viewport.dirty) {
    //     cull.cull(viewport.getVisibleBounds());
    //     viewport.dirty = false;
    //   }
    // });
  
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
