import { BehaviorSubject, Subject } from 'rxjs';
import * as PIXI from "pixi.js";
import { WorldMap } from './WorldMap';
import { Viewport } from 'pixi-viewport';
import * as Honeycomb from 'honeycomb-grid';
import { IHex } from './MapViewer';

export class MapManager {
  isInitialized: boolean;
  public viewport$: BehaviorSubject<Viewport>;
  public worldMap$: BehaviorSubject<WorldMap>;
  public moveEvents$: Subject<PIXI.Point>;
  public selectHex$: BehaviorSubject<Honeycomb.Hex<IHex>>;

  constructor(
    worldMap: WorldMap
  ) {
    this.viewport$ = new BehaviorSubject(null);
    this.worldMap$ = new BehaviorSubject(worldMap);
    console.log('worldMap', worldMap);
    (window as any).worldMap = worldMap;
    this.moveEvents$ = new Subject();
    this.selectHex$ = new BehaviorSubject(null);
  }

  get worldMap() {
    return this.worldMap$.value;
  }

  updateWorldMap(worldMap: WorldMap) {
    (window as any).worldMap = worldMap;
    this.worldMap$.next(worldMap);
  }

  updateViewport(viewport: Viewport) {
    (window as any).viewport = viewport;
    this.viewport$.next(viewport);
  }

  resetViewport() {
    this.viewport$.value.setZoom(1, true);
    this.moveEvents$.next(this.viewport$.value.center);
  }

  jumpToHex(x: number, y: number) {
    const point = this.worldMap$.value.getPointFromPosition(x, y);
    if (point) {
      this.moveEvents$.next(point);
      return true;
    }
    return false;
  }

  selectHex(x: number, y: number) {
    this.selectHex$.next(this.worldMap$.value.getHex(x, y));
  }
}