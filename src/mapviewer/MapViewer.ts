import * as PIXI from "pixi.js";
import { Viewport } from "pixi-viewport";
import * as Honeycomb from 'honeycomb-grid'
import Stats from 'stats.js';
import { HexTilemap } from "./HexTilemap";
import { WorldMap } from "./WorldMap";
import { MapManager } from './MapManager';
import { BehaviorSubject } from "rxjs";
import { round } from "lodash";

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

export const Hex = Honeycomb.extendHex<IHex>({
  size: {
    width: HEX_WIDTH,
    height: HEX_HEIGHT,
  },
  orientation: 'flat'
} as any);

export const Grid = Honeycomb.defineGrid(Hex);

export class MapViewer {
  app: PIXI.Application;
  viewport: Viewport;
  movePoint: PIXI.Point;
  keyMap: Record<string, boolean>;
  mapFocused$: BehaviorSubject<boolean>;

  constructor(
    protected element: HTMLElement,
    protected manager: MapManager,
    public resources: PIXI.IResourceDictionary,
    public fonts: Record<string, any>
  ) {
    PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST;
    PIXI.settings.PRECISION_FRAGMENT = PIXI.PRECISION.HIGH;
    this.app = new PIXI.Application({
      width: window.innerWidth,
      height: window.innerHeight,
      // resolution: window.devicePixelRatio,
      antialias: false,
    });
    const app = this.app;
  
    element.appendChild(app.view);

    // handle map focus
    this.mapFocused$ = new BehaviorSubject(false);
    element.addEventListener('focus', () => {
      this.mapFocused$.next(true);
    });
    element.addEventListener('blur', () => {
      this.mapFocused$.next(false);
    });
    element.addEventListener('mouseenter', () => {
      element.focus();
    });
  
    const stats = new Stats();
    stats.showPanel(0);
    document.body.appendChild( stats.dom );
  
    app.ticker.add(() => {
      stats.begin();
      app.renderer.render(app.stage);
      stats.end();
    }, PIXI.UPDATE_PRIORITY.LOW);
    this.setupViewport();
    this.setupTilemap();
  }

  setupViewport() {
    // create viewport
    const viewport = new Viewport({
      screenWidth: this.app.view.offsetWidth,
      screenHeight: this.app.view.offsetHeight,
      interaction: this.app.renderer.plugins.interaction,
    })

    this.mapFocused$.subscribe(isFocused => {
      if (isFocused) {
        viewport.pause = false;
      } else {
        viewport.pause = true;
      }
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
    this.manager.moveEvents$.next(this.movePoint);
  }

  setupTilemap() {
    console.log('resources', this.resources);

    this.manager.updateViewport(this.viewport);
    this.viewport.on('moved', () => {
      this.manager.updateViewport(this.viewport);
    });

    this.manager.moveEvents$.subscribe(point => {
      this.viewport.moveCenter(point);
      this.manager.updateViewport(this.viewport);
    });

    this.manager.worldMap.generate();

    const tilemap = new HexTilemap(this.app, this.manager.worldMap, this.viewport, this.resources, this.fonts);

    document.addEventListener('keyup', event => {
      if (event.key === 'o') {
        console.log('toggle overlay');
        tilemap.overlayLayer.alpha = tilemap.overlayLayer.alpha === 0 ? 0.75 : 0;
      }
    }, false);
    // update selected hex layer when selected hex changes
    this.manager.selectHex$.subscribe(hexCoordinate => {
      if (hexCoordinate) {
        tilemap.updateSelection(hexCoordinate);
      }
    });
    console.log('tilemap', tilemap);
    this.viewport.addChild(tilemap);
  }

  destroy() {
    this.app.destroy();
    document.removeEventListener('keydown', this.handleKeyboard.bind(this), false);
    document.removeEventListener('keyup', this.handleKeyboard.bind(this), false);
  }
}
