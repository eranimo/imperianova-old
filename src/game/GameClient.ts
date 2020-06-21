import { spawn, Thread, Worker } from "threads";
import { ObservablePromise } from "threads/dist/observable-promise";
import { GameSpeed, TimeState, GameState } from './shared';
import { Observable } from "threads/observable";
import { ObjectView } from "structurae";
import { BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';
import { Game } from './worker/Game';


let game: Game;

export class GameClient {
  public initialized: boolean;
  private thread: any;
  gameState: Int32Array;

  constructor() {
    this.initialized = false;
    this.thread = null;
  }

  async init() {
    (window as any).GameClient = this;
    game = new Game({
      currentDay: 0,
    });
    const thread = await spawn(new Worker('./worker/gameWorker'));

    const sab = new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT * 2);
    this.gameState = new Int32Array(sab);
    this.gameState[0] = 0;
    this.gameState[1] = game.day$.value;

    await thread.init(sab);

    console.log(thread);

    this.thread = thread;
    this.initialized = true;

    game.day$.subscribe(day => {
      Atomics.store(this.gameState, 1, day);
      Atomics.notify(this.gameState, 1, 1);
    })
  }

  play() {
    game.play();
    Atomics.store(this.gameState, 0, 1);
    Atomics.notify(this.gameState, 0, 1);
  }

  pause() {
    game.pause();
    Atomics.store(this.gameState, 0, 0);
    Atomics.notify(this.gameState, 0, 1);
  }

  setSpeed(speed: GameSpeed) {
    game.speed = speed;
  }

  get isPlaying$() { return game.isPlaying$; }
  get speed$() { return game.speed$; }
  get days$() { return game.day$; }

  get canGoSlower$() {
    return game.speed$.pipe(map(speed => speed !== GameSpeed.SLOW));
  }

  get canGoFaster$() {
    return game.speed$.pipe(map(speed => speed !== GameSpeed.FAST));
  }

  async destroy() {
    Thread.terminate(this.thread);
  }
}
