import { expose } from "threads/worker"
import { GameState } from '../shared';

expose({
  init(sab) {
    console.log('init worker', sab);

    const gameState = new Int32Array(sab);

    console.log('(worker) game state', gameState);

    // while(Atomics.wait(gameState, 0, 1) === 'ok') {
    //   console.log('playing');
    // }
  }
})