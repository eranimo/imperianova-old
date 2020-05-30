
export enum TerrainType {
  MAP_EDGE = 0,
  OCEAN = 1,
  LAND = 2,
  FOREST = 3,
  DESERT = 4,
}
export const terrainTypes = [
  TerrainType.MAP_EDGE,
  TerrainType.OCEAN,
  TerrainType.LAND,
  TerrainType.FOREST,
  TerrainType.DESERT,
];
export const terrainTypeMax = 4;

// a map of center terrain types to edge terrain types
// representing which terrains have transitions
export const terrainTransitions: Partial<Record<TerrainType, TerrainType[]>> = {
  [TerrainType.LAND]: [TerrainType.FOREST, TerrainType.DESERT],
  [TerrainType.OCEAN]: [TerrainType.LAND, TerrainType.FOREST, TerrainType.DESERT],
};

export const terrainBackTransitions = {
  [TerrainType.FOREST]: [TerrainType.LAND],
  [TerrainType.LAND]: [TerrainType.OCEAN],
  [TerrainType.FOREST]: [TerrainType.OCEAN, TerrainType.LAND],
  [TerrainType.DESERT]: [TerrainType.OCEAN, TerrainType.LAND],
}

export const terrainColors: Record<TerrainType, number> = {
  [TerrainType.MAP_EDGE]: 0x000000,
  [TerrainType.OCEAN]: 0x3F78CB,
  [TerrainType.LAND]: 0x81B446,
  [TerrainType.FOREST]: 0x236e29,
  [TerrainType.DESERT]: 0xD9BF8C,
};

export const terrainMinimapColors: Record<TerrainType, string> = {
  [TerrainType.MAP_EDGE]: '#000000',
  [TerrainType.OCEAN]: '#3F78CB',
  [TerrainType.LAND]: '#81B446',
  [TerrainType.FOREST]: '#236e29',
  [TerrainType.DESERT]: '#D9BF8C',
};

export const terrainTypeTitles: Record<TerrainType, string> = {
  [TerrainType.MAP_EDGE]: 'MAP EDGE',
  [TerrainType.OCEAN]: 'Ocean',
  [TerrainType.LAND]: 'Land',
  [TerrainType.FOREST]: 'Forest',
  [TerrainType.DESERT]: 'Desert',
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
