import { expose } from "threads/worker"
import { GameState } from '../shared';
import { ObjectView } from 'structurae';

class GameWorkerLoop {
  private rafID: number;
  lastUpdateDay: number;

  constructor(private gameState: ObjectView) {
    this.lastUpdateDay = 0;
  }

  play() {
    if (this.rafID) {
      this.pause();
    }
    this.rafID = requestAnimationFrame(this.update.bind(this));
  }

  pause() {
    if (this.rafID) {
      cancelAnimationFrame(this.rafID);
    }
  }

  private update() {
    const days = this.gameState.get('days');
    if (this.lastUpdateDay < days) {
      this.lastUpdateDay = days;
    }
    this.rafID = requestAnimationFrame(this.update.bind(this));
  }
}

let gameState: ObjectView;
let loop: GameWorkerLoop;

expose({
  init(sab) {
    console.log('init worker', sab);
    gameState = new GameState(sab);
    loop = new GameWorkerLoop(gameState);
    console.log('(worker) game state', gameState);
  },

  play() {
    loop.play();
  },

  pause() {
    loop.pause();
  },

  newDay(day: number) {
    gameState[1] = day;
  }
})