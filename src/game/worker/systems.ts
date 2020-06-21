import { System } from './entities';


export const popAgeSystem = new System({
  name: 'PopAgeSystem',
  filterEntities: (entity) => entity.type === 'pop',
  updateEntity: (entity, gameState) => {
    entity.data.set('age', entity.data.get('age') + 1);
  },
  interval: 1,
});

export const debugSystem = new System({
  name: 'DebugSystem',
  // enabled: false,
  filterEntities: () => true,
  updateEntity: entity => {
    console.log('entity', entity.id, entity.data.toJSON());
  },
  interval: 1,
});