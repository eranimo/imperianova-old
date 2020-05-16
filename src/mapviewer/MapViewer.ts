import * as PIXI from "pixi.js-legacy";
import { Viewport } from "pixi-viewport";
import * as Honeycomb from 'honeycomb-grid'
import Stats from 'stats.js';
import Cull from 'pixi-cull';


const HEX_SIZE = 10;
const HEX_WIDTH = Math.sqrt(3) * HEX_SIZE;
const HEX_HEIGHT = 2 * HEX_SIZE;
const GRID_WIDTH = 170;
const GRID_HEIGHT = 150;

function setupGrid() {
  const Hex = Honeycomb.extendHex({
    size: HEX_SIZE,
  })
  const Grid = Honeycomb.defineGrid(Hex)
  return Grid;
}

function drawGrid(grid, viewport) {
  console.log('draw grid');
  grid.rectangle({ width: GRID_WIDTH, height: GRID_HEIGHT }).forEach(hex => {
    const graphics = new PIXI.Graphics();
    graphics.lineStyle(1, 0x999999);
    const point = hex.toPoint();
    // // add the hex's position to each of its corner points
    // const corners = hex.corners().map(corner => corner.add(point))
    // separate the first from the other corners
    const [firstCorner, ...otherCorners] = hex.corners();

    // move the "pen" to the first corner
    graphics.moveTo(firstCorner.x, firstCorner.y)
    // draw lines to the other corners
    otherCorners.forEach(({ x, y }) => graphics.lineTo(x, y))
    // finish at the first corner
    graphics.lineTo(firstCorner.x, firstCorner.y)
    const hexContainer = new PIXI.Container();
    hexContainer.addChild(graphics)
    hexContainer.position.set(point.x, point.y);
    viewport.addChild(hexContainer);
  });
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
    xSize: HEX_WIDTH,
    ySize: HEX_HEIGHT,
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
