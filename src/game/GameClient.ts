import { spawn, Thread, Worker } from "threads";
import { ObservablePromise } from "threads/dist/observable-promise";
import { GameSpeed, TimeState, GameState, UpdateMessage, UpdateType, entityFactories, EntityType, entityTypes } from './shared';
import { Observable } from "threads/observable";
import { ObjectView } from 'structurae';
import { BehaviorSubject, from } from 'rxjs';
import { map } from 'rxjs/operators';
import { Game } from './worker/Game';
import { ObservableSet } from './ObservableSet';

let game: Game;

class EntityView {
  public lastUpdateDay: number;
  private data$: BehaviorSubject<any>;

  constructor(
    public entityType: EntityType,
    public entityID: number,
    data: ObjectView,
  ) {
    this.data$ = new BehaviorSubject(data.toJSON());
  }

  get get$() {
    return this.data$;
  }

  update(day: number, data: ObjectView) {
    this.lastUpdateDay = day;
    this.data$.next(data.toJSON());
  }
}

class EntityViewStore {
  public entities$: ObservableSet<EntityView>;
  private entityByID: Map<number, EntityView>;
  private entityData: Map<number, ObjectView>;

  constructor(public gameState: ObjectView) {
    this.entityByID = new Map();
    this.entities$ = new ObservableSet();
    this.entityData = new Map();
  }

  getEntity$(entityID: number) {
    return this.entityByID.get(entityID).get$;
  }

  add(
    entityType: EntityType,
    entityID: number,
    data: ObjectView,
  ) {
    const entityView = new EntityView(entityType, entityID, data);
    entityView.update(this.gameState.get('days'), data);
    this.entityData.set(entityID, data);
    this.entityByID.set(entityID, entityView);
    this.entities$.add(entityView);
  }

  update(
    entityID: number,
  ) {
    const data = this.entityData.get(entityID);
    this.entityByID.get(entityID).update(this.gameState.get('days'), data);
  }

  remove(entityID: number) {
    this.entityData.delete(entityID);
    this.entities$.delete(this.entityByID.get(entityID))
    this.entityByID.delete(entityID);
  }
}

class EntityViewManager {
  entityViewStore: Map<EntityType, EntityViewStore>;

  constructor(
    public gameState: ObjectView
  ) {
    this.entityViewStore = new Map<EntityType, EntityViewStore>();
    for (const entityType of entityTypes) {
      this.entityViewStore.set(entityType, new EntityViewStore(gameState));
    }
  }

  onNewUpdate(update: UpdateMessage) {
    if (update.updateType === UpdateType.ADD) {
      const factory = entityFactories[update.entityType];
      const data = new factory(update.sab);
      this.entityViewStore.get(update.entityType).add(update.entityType, update.entityID, data);
    } else if (update.updateType === UpdateType.REMOVE) {
      this.entityViewStore.get(update.entityType).remove(update.entityID);
    } else if (update.updateType === UpdateType.UPDATE) {
      // console.log('update', update);
      this.entityViewStore.get(update.entityType).update(update.entityID);
    }
  }
}

export class GameClient {
  public initialized: boolean;
  private thread: any;
  entityViewManager: EntityViewManager;
  gameState: ObjectView;
  entityData: Map<number, ObjectView> = new Map();

  constructor() {
    this.initialized = false;
    this.thread = null;
    this.entityData = new Map();
  }

  async init() {
    (window as any).GameClient = this;
    game = new Game({
      currentDay: 0,
    });
    const thread = await spawn(new Worker('./worker/gameWorker'));

    const sab = new SharedArrayBuffer(GameState.getLength());
    this.gameState = new GameState(sab);
    this.entityViewManager = new EntityViewManager(this.gameState);

    thread.entityUpdates().subscribe((update: UpdateMessage) => {
      this.entityViewManager.onNewUpdate(update);
    });

    await thread.init(sab);

    console.log('thread instance', thread);

    this.thread = thread;
    this.initialized = true;

    game.day$.subscribe(day => {
      thread.newDay(day);
      this.gameState.set('days', day);
    });

    // thread.watchEntity(EntityType.POP, 0);
  }

  watchEntity(entityType: EntityType, entityID: number) {
    this.entityViewManager.entityViewStore.get(entityType).update(entityID);
    this.thread.watchEntity(entityType, entityID);
  }

  unwatchEntity(entityType: EntityType, entityID: number) {
    this.thread.unwatchEntity(entityType, entityID);
  }

  play() {
    game.play();
  }

  pause() {
    game.pause();
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
