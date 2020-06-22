import { System } from './entities';
import { EntityType } from '../shared';


export const popAgeSystem = new System({
  name: 'PopAgeSystem',
  filterEntities: (entity) => entity.type === EntityType.POP,
  updateEntity: (entity, gameState) => {
    entity.setValue('age', entity.getValue('age') + 1);
    entity.setValue('size', entity.getValue('size') + 1);
  },
  interval: 1,
});

export const debugSystem = new System({
  name: 'DebugSystem',
  enabled: false,
  filterEntities: () => true,
  updateEntity: entity => {
    console.log('entity', entity.id, entity.data.toJSON());
  },
  interval: 1,
});