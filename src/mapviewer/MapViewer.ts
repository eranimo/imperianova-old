import * as PIXI from "pixi.js";
import { Viewport } from "pixi-viewport";
import * as Honeycomb from 'honeycomb-grid'
import Stats from 'stats.js';


const HEX_SIZE = 10;
const GRID_WIDTH = 75;
const GRID_HEIGHT = 50;

function setupGrid() {
  const Hex = Honeycomb.extendHex({
    size: HEX_SIZE,
  })
  const Grid = Honeycomb.defineGrid(Hex)
  return Grid;
}

function drawGrid(grid, viewport) {
  grid.rectangle({ width: GRID_WIDTH, height: GRID_HEIGHT }).forEach(hex => {
    const graphics = new PIXI.Graphics();
    graphics.lineStyle(1, 0x999999);
    const point = hex.toPoint()
    // add the hex's position to each of its corner points
    const corners = hex.corners().map(corner => corner.add(point))
    // separate the first from the other corners
    const [firstCorner, ...otherCorners] = corners

    // move the "pen" to the first corner
    graphics.moveTo(firstCorner.x, firstCorner.y)
    // draw lines to the other corners
    otherCorners.forEach(({ x, y }) => graphics.lineTo(x, y))
    // finish at the first corner
    graphics.lineTo(firstCorner.x, firstCorner.y)
    graphics.renderable
    viewport.addChild(graphics);
  });

}


function setupApp(element: HTMLElement) {
  const app = new PIXI.Application({
    width: window.innerWidth,
    height: window.innerHeight,
    resolution: window.devicePixelRatio,
    antialias: true,
  });
  element.appendChild(app.view);

  const stats = new Stats();
  stats.showPanel(0);
  document.body.appendChild( stats.dom );

  var ticker = new PIXI.Ticker();
  ticker.add(() => {
    stats.begin();
    app.renderer.render(app.stage);
    stats.end();
  }, PIXI.UPDATE_PRIORITY.LOW);
  ticker.start();

  // create viewport
  const viewport = new Viewport({
    screenWidth: window.innerWidth,
    screenHeight: window.innerHeight,
    worldWidth: HEX_SIZE * GRID_WIDTH,
    worldHeight: HEX_SIZE * GRID_HEIGHT,
    interaction: app.renderer.plugins.interaction,
  });

  // add the viewport to the stage
  app.stage.addChild(viewport);

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
