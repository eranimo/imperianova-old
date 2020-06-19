import { Subject } from "threads/observable"
import { Observable } from "observable-fns"
import { expose } from "threads/worker"
import { IGameOptions, Game } from './Game';

let game: Game;

class BehaviorSubject<T> extends Subject<T> {
  value: T;

  constructor(initialValue: T) {
    super();
    this.value = initialValue;
  }

  next(value: T) {
    super.next(value);
    this.value = value;
  }
}

const days = new BehaviorSubject<number>(0);
const playState = new Subject<{ isPlaying: boolean }>();

playState.subscribe((value) => {
  console.log('worker play state', value);
})

expose({
  startGame(options: IGameOptions) {
    console.log('start game');
    game = new Game(options);

    game.day.subscribe(day => {
      days.next(day);
    });

    return {
      playState: { isPlaying: false },
      day: 0,
    };
  },

  play() {
    console.log('PLAY');
    playState.next({ isPlaying: true });
    game.loop.play();
  },

  pause() {
    console.log('PAUSE');
    playState.next({ isPlaying: false });
    game.loop.pause();
  },

  playState$() {
    return Observable.from(playState);
  },

  day$() {
    return Observable.from(days);
  },
})