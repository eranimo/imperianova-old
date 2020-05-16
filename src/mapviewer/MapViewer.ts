import * as PIXI from "pixi.js-legacy";
import { Viewport } from "pixi-viewport";
import * as Honeycomb from 'honeycomb-grid'
import Stats from 'stats.js';
import Cull from 'pixi-cull';


const HEX_SIZE = 10;
const HEX_WIDTH = Math.sqrt(3) * HEX_SIZE;
const HEX_HEIGHT = 2 * HEX_SIZE;
const GRID_WIDTH = 100;
const GRID_HEIGHT = 100;
const CHUNK_SIZE = 5;
const GRID_CHUNK_WIDTH = GRID_WIDTH / CHUNK_SIZE;
const GRID_CHUNK_HEIGHT = GRID_HEIGHT / CHUNK_SIZE;
const CHUNK_WIDTH = (HEX_WIDTH * CHUNK_SIZE) + (HEX_WIDTH / 2);
const CHUNK_HEIGHT = (HEX_HEIGHT * CHUNK_SIZE) - HEX_HEIGHT;

// debug
const DEBUG_CHUNK_GRID = false;

function setupGrid() {
  const Hex = Honeycomb.extendHex({
    size: HEX_SIZE,
  })
  const Grid = Honeycomb.defineGrid(Hex)
  return Grid;
}

function drawGrid(grid, viewport) {
  console.log('draw grid');
  const hexgrid = grid.rectangle({
    width: GRID_WIDTH,
    height: GRID_HEIGHT,
  });
  let chunkHexes;
  for (let cx = 0; cx < GRID_CHUNK_WIDTH; cx++) {
    for (let cy = 0; cy < GRID_CHUNK_HEIGHT; cy++) {
      chunkHexes = [];
      console.group(`Drawing chunk (${cx}, ${cy})`);
      console.time('get hexes in chunk');
      for (let hx = 0; hx < CHUNK_SIZE; hx++) {
        const index = hexgrid.indexOf(hexgrid.get({
          x: cx * CHUNK_SIZE,
          y: cy * CHUNK_SIZE + hx,
        }))
        for (let hy = 0; hy < CHUNK_SIZE; hy++) {
          chunkHexes.push(hexgrid[index + hy])
        }
      }
      console.log(chunkHexes);
      console.timeEnd('get hexes in chunk');
      const chunkContainer = new PIXI.Container();
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
        const [firstCorner, ...otherCorners] = hex.corners().map(corner => corner.add(point));

        graphics.beginFill(0x333333);
        graphics.moveTo(firstCorner.x, firstCorner.y);
        otherCorners.forEach(({ x, y }) => graphics.lineTo(x, y))
        graphics.lineTo(firstCorner.x, firstCorner.y);
        graphics.endFill();
      });

      if (DEBUG_CHUNK_GRID) {
        graphics.lineStyle(1, 0x009999);
        graphics.moveTo(0, 0);
        graphics.lineTo(0, CHUNK_HEIGHT);
        graphics.lineTo(CHUNK_WIDTH, CHUNK_HEIGHT);
        graphics.lineTo(CHUNK_WIDTH, 0);
        graphics.lineTo(0, 0);
      }
      chunkContainer.addChild(graphics);
      viewport.addChild(chunkContainer);
      console.timeEnd('chunk draw');
      console.groupEnd();
    }
  }
}

function setupApp(element: HTMLElement) {
  const app = new PIXI.Application({
    width: window.innerWidth,
    height: window.innerHeight,
    resolution: window.devicePixelRatio,
    antialias: false,
  });
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

  const cull = new Cull.SpatialHash({
    xSize: CHUNK_WIDTH,
    ySize: CHUNK_HEIGHT,
  });
  cull.addContainer(viewport);
  cull.cull(viewport.getVisibleBounds());
  app.ticker.add(() => {
    if (viewport.dirty) {
      cull.cull(viewport.getVisibleBounds());
      viewport.dirty = false;
    }
  });

  // add the viewport to the stage
  app.stage.addChild(viewport);
  console.log('viewport', viewport);

  // activate plugins
  viewport.drag().pinch().wheel().decelerate();

  const grid = setupGrid();
  drawGrid(grid, viewport);
  
  return app;
}

export function initGame(element: HTMLDivElement) {
  console.time('setup');
  const app = setupApp(element);
  console.timeEnd('setup');
  return () => {
    app.destroy();
  };
}
