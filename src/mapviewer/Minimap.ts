import * as PIXI from "pixi.js";
import { WorldMap } from './WorldMap';
import { terrainMinimapColors } from './constants';
import { MapManager } from './MapManager';
import { logGroupTime } from './utils';
import { memoize } from 'lodash';
import { Viewport } from 'pixi-viewport';


const scale = 1; // window.devicePixelRatio;

export class Minimap {
  width: number;
  height: number;
  worldWidth: number;
  worldHeight: number;
  background: CanvasRenderingContext2D;
  frame: CanvasRenderingContext2D;
  centerPoint: PIXI.Point;

  isPanning: boolean;

  constructor(
    protected container: HTMLDivElement,
    protected manager: MapManager,
  ) {
    this.width = 300;
    this.height = 150;
    this.worldWidth = this.manager.worldMap.hexgrid.pointWidth();
    this.worldHeight = this.manager.worldMap.hexgrid.pointHeight();

    this.background = this.setupCanvas('background');
    this.frame = this.setupCanvas('frame');
    
    manager.worldMap$.subscribe(worldMap => this.drawBackground(worldMap));
    manager.viewport$.subscribe(viewport => this.drawFrame(viewport))
    
    this.centerPoint = new PIXI.Point();
    this.isPanning = false;
    this.setupEvents();
  }

  onMouseDown = (event: MouseEvent) => {
    this.isPanning = true;
    this.centerViewport(event);  
  }

  onMouseMove = (event: MouseEvent) => {
    if (this.isPanning) {
      this.centerViewport(event);  
    }
  }

  onMouseUp = () => {
    this.isPanning = false;
  }

  private setupEvents() {
    this.container.addEventListener('mousedown', this.onMouseDown);
    this.container.addEventListener('mouseup', this.onMouseUp);
    this.container.addEventListener('mousemove', this.onMouseMove);
  }

  destroy() {
    this.container.removeEventListener('mousedown', this.onMouseDown);
    this.container.removeEventListener('mouseup', this.onMouseUp);
    this.container.removeEventListener('mousemove', this.onMouseMove);
  }

  private centerViewport(event: MouseEvent) {
    const viewport = this.manager.viewport$.value;
    const x = (event.offsetX / this.width);
    const y = (event.offsetY / this.height);
    const worldX = viewport.worldWidth * x + (viewport.worldScreenWidth / scale / 2);
    const worldY = viewport.worldHeight * y + (viewport.worldScreenHeight / scale / 2);
    this.centerPoint.set(worldX, worldY);
    this.manager.moveEvents$.next(this.centerPoint);
  }

  private drawFrame(viewport: Viewport) {
    if (viewport === null) return;
    const width = Math.floor(this.width * scale);
    const height = Math.floor(this.height * scale);
    this.frame.clearRect(-10, -10, width + 10, height + 10);
    this.frame.strokeStyle = 'white';
    this.frame.beginPath();
    const p1 = this.scalePoint(viewport.left, viewport.top);
    const p2 = this.scalePoint(viewport.worldScreenWidth / scale, viewport.worldScreenHeight / scale);
    this.frame.rect(p1[0], p1[1], p2[0], p2[1]);
    this.frame.stroke();
  }

  @logGroupTime('draw minimap background')
  private drawBackground(worldMap: WorldMap) {
    const background = this.background;

    worldMap.hexgrid.forEach(hex => {
      const terrainType = worldMap.terrain.get(hex.x, hex.y);
      const point = hex.toPoint();
      const corners = hex.corners().map(corner => corner.add(point))
      const [firstCorner, ...otherCorners] = corners;
      background.fillStyle = terrainMinimapColors[terrainType];
      background.beginPath();
      background.moveTo(
        ...this.scalePoint(firstCorner.x, firstCorner.y)
      );
      otherCorners.forEach(({ x, y }) => background.lineTo(
        ...this.scalePoint(x, y)
      ))
      background.lineTo(
        ...this.scalePoint(firstCorner.x, firstCorner.y)
      )
      background.fill();
      background.closePath();
    });
    // background.translate(-0.5, -0.5);
  }

  private scalePoint(x: number, y: number): [number, number] {
    const width = Math.floor(this.width * scale);
    const height = Math.floor(this.height * scale);

    return [
      Math.round((x / this.worldWidth) * width),
      Math.round((y / this.worldHeight) * height),
    ];
  }

  private setupCanvas(id: string) {
    const canvas = document.createElement('canvas');
    canvas.id = id;
    this.container.appendChild(canvas);
    canvas.style.width = `${this.width}px`;
    canvas.style.height = `${this.height}px`;
    const ctx = canvas.getContext('2d');

    canvas.width = Math.floor(this.width * scale);
    canvas.height = Math.floor(this.height * scale);
    ctx.translate(0.5, 0.5);
    return ctx;
  }
}
