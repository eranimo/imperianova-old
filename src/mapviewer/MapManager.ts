import { BehaviorSubject, Subject } from 'rxjs';
import * as PIXI from "pixi.js";import { WorldMap } from './WorldMap';

import { Viewport } from 'pixi-viewport';

export class MapManager {
  isInitialized: boolean;
  public viewport$: BehaviorSubject<Viewport>;
  public worldMap$: BehaviorSubject<WorldMap>;
  public moveEvents$: Subject<PIXI.Point>;

  constructor(
    worldMap: WorldMap
  ) {
    this.viewport$ = new BehaviorSubject(null);
    this.worldMap$ = new BehaviorSubject(worldMap);
    console.log('worldMap', worldMap);
    this.moveEvents$ = new Subject();
  }

  get worldMap() {
    return this.worldMap$.value;
  }

  updateWorldMap(worldMap: WorldMap) {
    this.worldMap$.next(worldMap);
  }

  updateViewport(viewport: Viewport) {
    this.viewport$.next(viewport);
  }
}