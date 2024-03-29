
export const enum TerrainType {
  MAP_EDGE = 0,
  OCEAN = 1,
  GRASSLAND = 2,
  FOREST = 3,
  DESERT = 4,
  TAIGA = 5,
  TUNDRA = 6,
  GLACIAL = 7,
  RIVER = 8,
}
export const terrainTypes = [
  TerrainType.MAP_EDGE,
  TerrainType.OCEAN,
  TerrainType.GRASSLAND,
  TerrainType.FOREST,
  TerrainType.DESERT,
  TerrainType.TAIGA,
  TerrainType.TUNDRA,
  TerrainType.GLACIAL,
  TerrainType.RIVER,
];
export const terrainTypeMax = 8;

// a map of center terrain types to edge terrain types
// representing which terrains have transitions
// center -> edge
export const terrainTransitions: Partial<Record<TerrainType, TerrainType[]>> = {
  [TerrainType.OCEAN]: [TerrainType.DESERT, TerrainType.GRASSLAND, TerrainType.FOREST, TerrainType.TAIGA, TerrainType.TUNDRA, TerrainType.GLACIAL],
  [TerrainType.FOREST]: [TerrainType.TAIGA, TerrainType.GRASSLAND],
  [TerrainType.DESERT]: [TerrainType.GRASSLAND, TerrainType.FOREST],
  [TerrainType.TUNDRA]: [TerrainType.GLACIAL, TerrainType.TAIGA],
  [TerrainType.TAIGA]: [TerrainType.GRASSLAND, TerrainType.GLACIAL],
};

export const riverTransitions: TerrainType[] = [
  TerrainType.GRASSLAND,
  TerrainType.FOREST,
  TerrainType.DESERT,
  TerrainType.TUNDRA,
  TerrainType.TAIGA,
];

// edge -> center
export const terrainBackTransitions: Partial<Record<TerrainType, TerrainType[]>> = {};
for (const [terrainType_, terrainTypes] of Object.entries(terrainTransitions)) {
  const terrainType = parseInt(terrainType_, 10) as TerrainType;
  for (const edgeTerrainType of terrainTypes) {
    if (terrainBackTransitions[edgeTerrainType] === undefined) {
      terrainBackTransitions[edgeTerrainType] = [terrainType];
    } else {
      terrainBackTransitions[edgeTerrainType].push(terrainType);
    }
  }
}

export const terrainColors: Record<TerrainType, number> = {
  [TerrainType.MAP_EDGE]: 0x000000,
  [TerrainType.OCEAN]: 0x3F78CB,
  [TerrainType.GRASSLAND]: 0x81B446,
  [TerrainType.FOREST]: 0x236e29,
  [TerrainType.DESERT]: 0xD9BF8C,
  [TerrainType.TAIGA]: 0x006259,
  [TerrainType.TUNDRA]: 0x96D1C3,
  [TerrainType.GLACIAL]: 0xFAFAFA,
  [TerrainType.RIVER]: 0x6793d5,
};

export const terrainMinimapColors: Record<TerrainType, string> = {
  [TerrainType.MAP_EDGE]: '#000000',
  [TerrainType.OCEAN]: '#3F78CB',
  [TerrainType.GRASSLAND]: '#81B446',
  [TerrainType.FOREST]: '#236e29',
  [TerrainType.DESERT]: '#D9BF8C',
  [TerrainType.TAIGA]: '#006259',
  [TerrainType.TUNDRA]: '#96D1C3',
  [TerrainType.GLACIAL]: '#FAFAFA',
  [TerrainType.RIVER]: '#6793d5', // not used
};

export const terrainTypeTitles: Record<TerrainType, string> = {
  [TerrainType.MAP_EDGE]: 'MAP EDGE',
  [TerrainType.OCEAN]: 'Ocean',
  [TerrainType.GRASSLAND]: 'Grassland',
  [TerrainType.FOREST]: 'Forest',
  [TerrainType.DESERT]: 'Desert',
  [TerrainType.TAIGA]: 'Taiga',
  [TerrainType.TUNDRA]: 'Tundra',
  [TerrainType.GLACIAL]: 'Glacial',
  [TerrainType.RIVER]: 'River',
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


export const adjacentDirections = {
  [Direction.SE]: [Direction.NE, Direction.S],
  [Direction.NE]: [Direction.N, Direction.SE],
  [Direction.N]: [Direction.NW, Direction.NE],
  [Direction.NW]: [Direction.SW, Direction.N],
  [Direction.SW]: [Direction.S, Direction.NW],
  [Direction.S]: [Direction.SE, Direction.SW],
};

export const oppositeDirections: Record<Direction, Direction> = {
  [Direction.SE]: Direction.NW,
  [Direction.NE]: Direction.SW,
  [Direction.N]: Direction.S,
  [Direction.NW]: Direction.SE,
  [Direction.SW]: Direction.NE,
  [Direction.S]: Direction.N,
}

export const indexOrder = [
  Direction.SE,
  Direction.NE,
  Direction.N,
  Direction.NW,
  Direction.SW,
  Direction.S,
]

export const renderOrder = [
  Direction.N,
  Direction.NW,
  Direction.NE,
  Direction.SW,
  Direction.SE,
  Direction.S,
];

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


export type SectionalTile = {
  tileID: number;
  direction: Direction;
  terrainType: TerrainType;
  terrainTypeCenter: TerrainType;

  terrainTypeSE?: TerrainType;
  terrainTypeNE?: TerrainType;
  terrainTypeN?: TerrainType;
  terrainTypeNW?: TerrainType;
  terrainTypeSW?: TerrainType;
  terrainTypeS?: TerrainType;
};

export type TileVariant = {
  terrainTypeCenter: TerrainType;
  neighborTerrainTypes: Record<Direction, TerrainType>;
  sideTileIDs: Record<Direction, number>;
  variantID: string;
  mask: number;
};