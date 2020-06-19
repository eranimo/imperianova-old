import { spawn, Thread, Worker } from "threads";
import { ObservablePromise } from "threads/dist/observable-promise";

export class GameClient {
  public initialized: boolean;
  private thread: any;
  playState: { isPlaying: boolean };
  day: number;

  constructor() {
    this.initialized = false;
    this.thread = null;
  }

  async init() {
    const thread = await spawn(new Worker('./worker/gameWorker'));    
    const { playState, day } = await thread.startGame({
      currentDay: 0,
    });
    this.playState = playState;
    this.day = day;

    console.log(playState, day);
    
    // thread.days().subscribe(day => {
    //   // console.log('day', day);
    // })
    console.log(thread);
    this.thread = thread;
    this.initialized = true;

    this.playState$.subscribe(value => {
      console.log('GameClient playState', value);
      this.playState = value;
    });
    this.day$.subscribe(value => this.day = value);
  }

  play() {
    console.log('play game');
    return this.thread.play();
  }

  pause() {
    console.log('pause game');
    return this.thread.pause();
  }

  get playState$(): ObservablePromise<{ isPlaying: boolean }> {
    return this.thread.playState$();
  }

  get day$(): ObservablePromise<number> {
    return this.thread.day$();
  }

  async destroy() {
    Thread.terminate(this.thread);
  }
}
