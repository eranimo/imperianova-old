
export enum TerrainType {
  MAP_EDGE = 0,
  OCEAN = 1,
  LAND = 2,
  FOREST = 3,
}
export const terrainTypeMax = 3;

export const terrainColors = {
  [TerrainType.MAP_EDGE]: 0x000000,
  [TerrainType.OCEAN]: 0x3F78CB,
  [TerrainType.LAND]: 0x81B446,
  [TerrainType.FOREST]: 0x236e29,
};

export const terrainMinimapColors = {
  [TerrainType.MAP_EDGE]: '#000000',
  [TerrainType.OCEAN]: '#3F78CB',
  [TerrainType.LAND]: '#81B446',
  [TerrainType.FOREST]: '#236e29',
};

export const terrainTypeTitles = {
  [TerrainType.MAP_EDGE]: 'MAP EDGE',
  [TerrainType.OCEAN]: 'Ocean',
  [TerrainType.LAND]: 'Land',
  [TerrainType.FOREST]: 'Forest',
};

export enum Direction {
  SE = 0,
  NE = 1,
  N = 2,
  NW = 3,
  SW = 4,
  S = 5
}


export const directionShort = {
  [Direction.SE]: 'SE',
  [Direction.NE]: 'NE',
  [Direction.N]: 'N',
  [Direction.NW]: 'NW',
  [Direction.SW]: 'SW',
  [Direction.S]: 'S',
}

export const directionTitles = {
  [Direction.SE]: 'South East',
  [Direction.NE]: 'North East',
  [Direction.N]: 'North',
  [Direction.NW]: 'North West',
  [Direction.SW]: 'South West',
  [Direction.S]: 'South',
}

export const oddq_directions = [
  [
    [+1, 0], [+1, -1], [0, -1],
    [-1, -1], [-1, 0], [0, +1]
  ],
  [
    [+1, +1], [+1, 0], [0, -1],
    [-1, 0], [-1, +1], [0, +1]
  ],
];
