import { ObjectViewMixin, MapViewMixin } from 'structurae';
import { add } from 'lodash';


export enum GameSpeed {
  SLOW,
  NORMAL,
  FAST,
}

export const GAME_SPEED_FPS = {
  [GameSpeed.SLOW]: 15,
  [GameSpeed.NORMAL]: 30,
  [GameSpeed.FAST]: 60,
}

export type TimeState = {
  isPlaying: boolean;
  speed: GameSpeed
}

export const GAME_SPEED_TITLE = {
  [GameSpeed.SLOW]: 'Slow',
  [GameSpeed.NORMAL]: 'Normal',
  [GameSpeed.FAST]: 'Fast',
}

export const GameState = ObjectViewMixin({
  $id: 'GameState',
  type: 'object',
  properties: {
    days: { type: 'integer', default: 0, },
  },
});

export const Pop = MapViewMixin({
  $id: 'Pop',
  type: 'object',
  properties: {
    age: { type: 'integer', default: 0 },
    size: { type: 'integer', default: 0 },
    birthDay: { type: 'integer', default: 0 },
    growthRate: { type: 'number', btype: 'float32', default: 0 },
  }
});

export enum UpdateType {
  ADD = 'Add',
  REMOVE = 'Remove',
  UPDATE = 'Update',
}
export type UpdateMessage = {
  entityID: number;
  entityType: string;
  updateType: UpdateType,
}