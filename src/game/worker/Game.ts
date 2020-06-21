import { BehaviorSubject } from 'rxjs';
import { GameSpeed, GAME_SPEED_FPS } from '../shared';

export interface IGameOptions {
  currentDay: number,
}

const defaultOptions = {
  currentDay: 0,
}

export class GameLoop {
  private rafID: number;
  private lastUpdateTime: number;
  private lagTime: number;

  constructor(
    private updateFunc: (ellapsedTime: number) => void,
    public targetFPS: GameSpeed = GameSpeed.NORMAL,
  ) {
    this.lagTime = 0;
    this.updateFunc(0);
  }

  setSpeed(fps: GameSpeed) {
    this.targetFPS = fps;
  }

  private get MS_PER_UPDATE() {
    return 1000 / GAME_SPEED_FPS[this.targetFPS];
  }

  private update() {
    if (!this.lastUpdateTime) {
      this.lastUpdateTime = self.performance.now();
    }
    
    const ellapsedTime = self.performance.now() - this.lastUpdateTime;

    // process input would go here
    if (ellapsedTime >= this.MS_PER_UPDATE) {
      this.lastUpdateTime = self.performance.now();
      this.updateFunc(ellapsedTime);
    }

    this.rafID = self.requestAnimationFrame(this.update.bind(this));
  }

  public play() {
    if (this.rafID) {
      this.pause();
    }
    this.rafID = self.requestAnimationFrame(this.update.bind(this));
  }

  public pause() {
    self.cancelAnimationFrame(this.rafID);
    this.rafID = null;
  }
}

export class Game {
  loop: GameLoop;
  public day$: BehaviorSubject<number>;
  public speed$: BehaviorSubject<GameSpeed>;
  public isPlaying$: BehaviorSubject<boolean>;

  constructor(options: IGameOptions = defaultOptions) {
    this.day$ = new BehaviorSubject(options.currentDay);
    this.speed$ = new BehaviorSubject(GameSpeed.NORMAL);
    this.isPlaying$ = new BehaviorSubject(false);
    this.loop = new GameLoop(() => this.update(), this.speed$.value);
    // this.loop.play();
  }

  get speed() {
    return this.loop.targetFPS;
  }

  set speed(fps: GameSpeed) {
    this.loop.targetFPS = fps;
    this.speed$.next(fps);
  }

  play() {
    this.loop.play();
    this.isPlaying$.next(true);
  }

  pause() {
    this.loop.pause();
    this.isPlaying$.next(false);
  }
  
  update() {
    this.day$.next(this.day$.value + 1);
  }
}