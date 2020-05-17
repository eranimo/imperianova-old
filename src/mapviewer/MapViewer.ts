import * as PIXI from "pixi.js-legacy";
import { Viewport } from "pixi-viewport";
import * as Honeycomb from 'honeycomb-grid'
import Stats from 'stats.js';
import Cull from 'pixi-cull';


const HEX_SIZE = 32;
const HEX_WIDTH = Math.sqrt(3) * HEX_SIZE;
const HEX_HEIGHT = 2 * HEX_SIZE;
const GRID_WIDTH = 200;
const GRID_HEIGHT = 200;

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
    const grass = getTilesetImage(tileset, 0);
    console.log(grass);

    const chunksContainer = new PIXI.Container();
    chunksContainer.sortableChildren = true;
    this.viewport.addChild(chunksContainer);

    hexgrid.forEach(hex => {
      const point = hex.toPoint();
      const hexSprite = new PIXI.Sprite();
      hexSprite.scale = new PIXI.Point(2, 2);
      hexSprite.position.set(point.x, point.y);
      hexSprite.position.y -= (24 * 2);
      hexSprite.position.y += 8;
      hexSprite.texture = grass;
      hexSprite.zIndex = (point.y * 1000)
      chunksContainer.addChild(hexSprite);
    });

    return chunksContainer;
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
