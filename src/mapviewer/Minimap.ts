import { WorldMap } from './WorldMap';
import { terrainMinimapColors } from './constants';


export function initMinimap(
  canvas: HTMLCanvasElement,
  worldMap: WorldMap,
) {
  const width = 300;
  const height = 150;
  const ctx = canvas.getContext('2d');
  const worldWidth = worldMap.hexgrid.pointWidth();
  const worldHeight = worldMap.hexgrid.pointHeight();
  console.time('minimap');

  worldMap.hexgrid.forEach(hex => {
    const terrainType = worldMap.terrain.get(hex.x, hex.y);
    const point = hex.toPoint();
    const corners = hex.corners().map(corner => corner.add(point))
    const [firstCorner, ...otherCorners] = corners;
    ctx.fillStyle = terrainMinimapColors[terrainType];
    ctx.beginPath();
    ctx.moveTo(
      (firstCorner.x / worldWidth) * width,
      (firstCorner.y / worldHeight) * height,
    )
    otherCorners.forEach(({ x, y }) => ctx.lineTo(
      (x / worldWidth) * width,
      (y / worldHeight) * height, 
    ))
    ctx.lineTo(
      (firstCorner.x / worldWidth) * width,
      (firstCorner.y / worldHeight) * height,
    )
    ctx.fill();
    ctx.closePath();
  });
  console.timeEnd('minimap');
}