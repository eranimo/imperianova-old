import { expose } from "threads/worker"
import { GameState, Pop } from '../shared';
import { ObjectView, MapViewMixin, MapView } from 'structurae';
import { iteratee } from "lodash";
import { Subject } from "rxjs";
import { EntityManager, System } from './entities';
import * as SYSTEMS from './systems';


let gameState: ObjectView;
let entityManager: EntityManager;

expose({
  init(sab) {
    console.log('init worker', sab);
    gameState = new GameState(sab);
    console.log('(worker) game state', gameState);
    entityManager = new EntityManager();

    entityManager.addEntityType('pop', Pop);
    for (const system of Object.values(SYSTEMS)) {
      entityManager.systems.add(system);
    }

    entityManager.init();

    entityManager.addEntity('pop', {
      age: 26,
      size: 1,
    });
  },

  entities() {
    return entityManager.addEntity$;
  },

  newDay(day: number) {
    gameState.set('days', day);
    console.log(`Day: ${day} Entities: ${entityManager.entities.size}`);
    entityManager.update(gameState);
  }
})