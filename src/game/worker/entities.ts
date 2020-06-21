import { Subject } from "rxjs";
import { ObjectView, MapViewMixin, MapView } from 'structurae';


export class Entity {
  constructor(
    public id: number,
    public type: string,
    public data: MapView,
  ) {}
}

export class EntityStore {
  constructor(
    public name: string,
    public factory: typeof MapView,
    private entities: Map<number, Entity> = new Map()
  ) {}

  addEntity(entity: Entity) {
    this.entities.set(entity.id, entity);
  }

  removeEntity(entity: Entity) {
    this.entities.delete(entity.id);
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
    this.enabled = options.enabled || true;
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
        return;
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
  public entityTypes: Map<string, EntityStore>;
  public systems: Set<System>;
  public entities: Set<Entity>;
  public addEntity$: Subject<Entity>;
  private lastEntityID: number;

  constructor() {
    this.entityTypes = new Map();
    this.systems = new Set();
    this.entities = new Set();
    this.addEntity$ = new Subject();
    this.lastEntityID = 0;
  }

  init() {
    for (const system of this.systems) {
      system.init(this);
    }
  }

  addEntityType(
    entityType: string,
    factory: typeof MapView,
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
    entityType: string,
    data: any,
  ) {
    if (!this.entityTypes.has(entityType)) {
      throw new Error(`Unrecognized entity type ${entityType}`);
    }
    const store = this.entityTypes.get(entityType);
    const entity = new Entity(this.lastEntityID, entityType, store.factory.from(data));
    this.entities.add(entity);
    this.lastEntityID++;
    this.addEntity$.next(entity);
    store.addEntity(entity);
  }
}