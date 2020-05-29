import * as PIXI from "pixi.js";
import { Viewport } from "pixi-viewport";
import * as Honeycomb from 'honeycomb-grid'
import Stats from 'stats.js';
import Cull from 'pixi-cull';
import { HexTilemap } from "./HexTilemap";
import { WorldMap } from "./WorldMap";
import { MapManager } from './MapManager';

// 32 pixels wide
// 28 pixels tall
// 2 pixels border on bottom
const HEX_WIDTH = 32;
const HEX_HEIGHT = 28;
const HEX_OFFSET_Y = 2;
const TEXTURE_HEIGHT = 48;
const TEXTURE_WIDTH = 32;
export const HEX_ADJUST_Y = TEXTURE_HEIGHT - HEX_HEIGHT - HEX_OFFSET_Y;


export interface IHex {
  index: number,
}

export function sortHexes(a: Honeycomb.Hex<IHex>, b: Honeycomb.Hex<IHex>) {
  if (a.r < b.r) {
    return -1;
  }
  if (a.r === b.r) {
    return 0;
  }
  return 1;
}

export const Hex = Honeycomb.extendHex<IHex>({
  size: {
    width: HEX_WIDTH,
    height: HEX_HEIGHT,
  },
  orientation: 'flat'
} as any);

export const Grid = Honeycomb.defineGrid(Hex);

class MapViewer {
  app: PIXI.Application;
  viewport: Viewport;
  cull: any;
  movePoint: PIXI.Point;
  keyMap: Record<string, boolean>;

  constructor(protected element: HTMLElement, protected manager: MapManager) {
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
    })
  
    this.cull = new Cull.Simple({
      dirtyTest: false,
    });
  
    // add the viewport to the stage
    this.app.stage.addChild(viewport);
    console.log('viewport', viewport);
  
    // activate plugins
    viewport.drag().pinch().wheel().decelerate();
    this.viewport = viewport;

    this.movePoint = new PIXI.Point();
    this.keyMap = {};
    document.addEventListener('keydown', this.handleKeyboard.bind(this), false);
    document.addEventListener('keyup', this.handleKeyboard.bind(this), false);
  }

  private handleKeyboard(event: KeyboardEvent) {
    this.keyMap[event.key] = event.type === 'keydown';
    this.movePoint.x = this.viewport.center.x;
    this.movePoint.y = this.viewport.center.y;

    if (this.keyMap['w'] || this.keyMap['ArrowUp']) {
      this.movePoint.y -= 50;
    }
    if (this.keyMap['s'] || this.keyMap['ArrowDown']) {
      this.movePoint.y += 50;
    }
    if (this.keyMap['a'] || this.keyMap['ArrowLeft']) {
      this.movePoint.x -= 50;
    }
    if (this.keyMap['d'] || this.keyMap['ArrowRight']) {
      this.movePoint.x += 50;
    }
    this.viewport.moveCenter(this.movePoint);
  }

  start(resources: PIXI.IResourceDictionary, fonts: Record<string, any>) {
    console.log('resources', resources);

    console.log('setup terrain');
    console.time('setup terrain');

    this.manager.updateViewport(this.viewport);
    this.viewport.on('moved', () => {
      this.manager.updateViewport(this.viewport);
    });

    this.manager.moveEvents$.subscribe(point => {
      this.viewport.moveCenter(point);
      this.manager.updateViewport(this.viewport);
    });

    this.manager.worldMap.generateTerrain();

    console.timeEnd('setup terrain');

    const tilemap = new HexTilemap(this.manager.worldMap, this.viewport, resources, fonts);
    console.log('tilemap', tilemap);
    this.viewport.addChild(tilemap);
  }

  destroy() {
    this.app.destroy();
    document.removeEventListener('keydown', this.handleKeyboard.bind(this), false);
    document.removeEventListener('keyup', this.handleKeyboard.bind(this), false);
  }
}

export function initGame(
  element: HTMLDivElement,
  manager: MapManager,
  resources: PIXI.IResourceDictionary,
) {
  console.time('setup');
  const mapViewer = new MapViewer(element, manager);
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
  return () => {
    if (mapViewer) {
      mapViewer.destroy();
    }
  };
}
