import { Subject } from "rxjs";
import { ObjectView, ObjectViewMixin } from 'structurae';
import { EntityType, entityFactories } from '../shared';


export class Entity {
  constructor(
    public id: number,
    public type: EntityType,
    public data: ObjectView,
    private gameState: ObjectView,
    private store: EntityStore,
  ) {
  }

  setValue(field: string, value: any) {
    this.store.lastTickUpdates.add(this.id);
    this.data.set(field, value);
  }

  getValue(field: string) {
    return this.data.get(field);
  }
}

export class EntityStore {
  lastTickUpdates: Set<number>;

  constructor(
    public name: string,
    public factory: typeof ObjectView,
    private entities: Map<number, Entity> = new Map()
  ) {
    this.lastTickUpdates = new Set();
  }

  addEntity(entity: Entity) {
    this.entities.set(entity.id, entity);
  }

  getEntity(entityID: number) {
    return this.entities.get(entityID);
  }

  removeEntity(entityID: number) {
    this.entities.delete(entityID);
  }
}

export type SystemOptions = {
  name: string,
  enabled?: boolean,
  filterEntities: (entity: Entity) => boolean,
  updateEntity: (entity: Entity, gameState: ObjectView) => void,
  interval: number,
}

export class System {
  public name: string;
  public enabled: boolean;
  private filterEntities: (entity: Entity) => boolean;
  private updateEntity: (entity: Entity, gameState: ObjectView) => void;
  private interval: number;
  private currentWait: number;
  private entities: Set<Entity>;


  constructor(options: SystemOptions) {
    this.name = options.name;
    this.enabled = options.enabled !== false;
    this.filterEntities = options.filterEntities;
    this.updateEntity = options.updateEntity;
    this.interval = options.interval;
    this.currentWait = 0;
    this.entities = new Set();
  }

  public init(manager: EntityManager) {
    manager.addEntity$.subscribe(entity => {
      if (this.filterEntities(entity)) {
        this.entities.add(entity);
      }
    });
  }

  update(gameState: ObjectView) {
    if (this.interval) {
      if (this.currentWait > 0) {
        this.currentWait--;
      } else if (this.currentWait === 0) {
        this.currentWait = this.interval;
      }
    }
    // console.log('System update', this.name, this.entities);
    for (const entity of this.entities) {
      this.updateEntity(entity, gameState);
    }
  }
}

export class EntityManager {
  public entityTypes: Map<EntityType, EntityStore>;
  public systems: Set<System>;
  public entities: Set<Entity>;
  public addEntity$: Subject<Entity>;
  public removeEntity$: Subject<Entity>;
  private lastEntityID: number;
  gameState: ObjectView;

  constructor() {
    this.entityTypes = new Map();
    this.systems = new Set();
    this.entities = new Set();
    this.addEntity$ = new Subject();
    this.removeEntity$ = new Subject();
    this.lastEntityID = 0;
  }

  init(gameState: ObjectView) {
    this.gameState = gameState;
    for (const system of this.systems) {
      system.init(this);
    }
  }

  addEntityType(
    entityType: EntityType,
    factory: typeof ObjectView,
  ) {
    this.entityTypes.set(entityType, new EntityStore(entityType, factory))
  }

  update(gameState: ObjectView) {
    for (const system of this.systems) {
      if (system.enabled) {
        system.update(gameState);
      }
    }
  }

  addEntity(
    entityType: EntityType,
    data: any,
  ) {
    if (!this.entityTypes.has(entityType)) {
      throw new Error(`Unrecognized entity type ${entityType}`);
    }
    const store = this.entityTypes.get(entityType);
    const length = store.factory.getLength();
    const sab = new SharedArrayBuffer(length)
    // const objectview = store.factory.from({});
    const objectview = new store.factory(sab);
    // console.log(objectview);
    for (const field of store.factory.fields) {
      objectview.set(field, data[field]);
    }
    const entity = new Entity(this.lastEntityID, entityType, objectview, this.gameState, store);
    this.entities.add(entity);
    this.lastEntityID++;
    this.addEntity$.next(entity);
    store.addEntity(entity);
  }

  removeEntity(
    entityType: EntityType,
    entityID: number,
  ) {
    if (!this.entityTypes.has(entityType)) {
      throw new Error(`Unrecognized entity type ${entityType}`);
    }
    const store = this.entityTypes.get(entityType);
    this.removeEntity$.next(store.getEntity(entityID));
    store.removeEntity(entityID);
  }
}