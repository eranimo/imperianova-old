import { BehaviorSubject } from 'rxjs';

export interface IGameOptions {
  currentDay: number,
}

const defaultOptions = {
  currentDay: 0,
}

export enum GameSpeed {
  SLOW = 30,
  NORMAL = 60,
  FAST = 120,
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

  private get MS_PER_UPDATE() {
    return 1000 / this.targetFPS;
  }

  private update() {
    if (!this.lastUpdateTime) {
      this.lastUpdateTime = self.performance.now();
    }
    
    const ellapsedTime = self.performance.now() - this.lastUpdateTime;
    this.lastUpdateTime = self.performance.now();
    this.lagTime += ellapsedTime;

    // process input would go here

    // console.log(this.lagTime, this.MS_PER_UPDATE);
    while (this.lagTime >= this.MS_PER_UPDATE) {
      this.lastUpdateTime = self.performance.now();
      this.updateFunc(ellapsedTime);
      this.lagTime -= this.MS_PER_UPDATE;
    }

    // render would go here

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
  public day: BehaviorSubject<number>;

  constructor(options: IGameOptions = defaultOptions) {
    this.day = new BehaviorSubject(options.currentDay);
    this.loop = new GameLoop(() => this.update());
    // this.loop.play();
  }

  update() {
    // console.log(1);
    this.day.next(this.day.value + 1);
  }
}