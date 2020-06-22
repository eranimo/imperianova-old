import { expose } from "threads/worker"
import { Subject as WorkerSubject, Observable as WorkerObservable } from "threads/observable";
import { GameState, UpdateMessage, UpdateType, entityFactories, EntityType } from '../shared';
import { ObjectView, ObjectViewMixin } from 'structurae';
import { iteratee } from "lodash";
import { EntityManager, System } from './entities';
import * as SYSTEMS from './systems';
import { map } from "rxjs/operators";
import { MultiDictionary } from 'typescript-collections';


let gameState: ObjectView;
let entityManager: EntityManager;
let entityUpdates: WorkerSubject<UpdateMessage> = new WorkerSubject();
let watchers: Map<EntityType, Set<number>>;

expose({
  init(sab) {
    console.log('init worker', sab);
    gameState = new GameState(sab);
    console.log('(worker) game state', gameState);
    entityManager = new EntityManager();

    entityManager.addEntityType(EntityType.POP, entityFactories[EntityType.POP])
    for (const system of Object.values(SYSTEMS)) {
      entityManager.systems.add(system);
    }
    watchers = new Map();
    for (const type of entityManager.entityTypes.keys()) {
      watchers.set(type, new Set());
    }

    entityManager.init(gameState);

    entityManager.addEntity$.subscribe(entity => entityUpdates.next({
      entityID: entity.id,
      entityType: entity.type,
      updateType: UpdateType.ADD,
      sab: entity.data.buffer as SharedArrayBuffer,
    }));

    entityManager.removeEntity$.subscribe(entity => entityUpdates.next({
      entityID: entity.id,
      entityType: entity.type,
      updateType: UpdateType.REMOVE
    }));

    // entityUpdates.subscribe(update => {
    //   console.log('(worker) update', update);
    // });

    for (let i = 0; i < 2; i++) {
      entityManager.addEntity(EntityType.POP, {
        age: 0,
        size: 1,
        birthDay: gameState.get('days'),
        growthRate: 1/10,
      });
    }
  },

  watchEntity(entityType: EntityType, entityID: number) {
    // console.log('watch', entityType, entityID);
    watchers.get(entityType).add(entityID);
  },

  unwatchEntity(entityType: EntityType, entityID: number) {
    // console.log('unwatch', entityType, entityID);
    watchers.get(entityType).delete(entityID);
  },

  entityUpdates() {
    return WorkerObservable.from(entityUpdates);
  },

  newDay(day: number) {
    gameState.set('days', day);
    // console.log(`Day: ${day} Entities: ${entityManager.entities.size}`);
    entityManager.update(gameState);
    for (const [type, store] of entityManager.entityTypes) {
      if (watchers.get(type).size > 0) {
        for (const id of store.lastTickUpdates) {
          if (watchers.get(type).has(id)) {
            entityUpdates.next({
              entityID: id,
              entityType: type,
              updateType: UpdateType.UPDATE,
            })
          }
        }
      }
      store.lastTickUpdates = new Set();
    }

    if (Math.random() < 0.1) {
      entityManager.addEntity(EntityType.POP, {
        age: 0,
        size: 1,
        birthDay: gameState.get('days'),
        growthRate: 1/10,
      });
    }
  }
})