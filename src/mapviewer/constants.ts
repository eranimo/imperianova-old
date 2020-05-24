
export enum TerrainType {
  NONE = 0,
  OCEAN = 1,
  LAND = 2
}

export const terrainColors = {
  [TerrainType.NONE]: 0x000000,
  [TerrainType.OCEAN]: 0x3F78CB,
  [TerrainType.LAND]: 0x81B446,
};

export const terrainMinimapColors = {
  [TerrainType.NONE]: '#000000',
  [TerrainType.OCEAN]: '#3F78CB',
  [TerrainType.LAND]: '#81B446',
};

export const terrainTypeTitles = {
  [TerrainType.OCEAN]: 'Ocean',
  [TerrainType.LAND]: 'Land',
};

export enum Direction {
  SE = 0,
  NE = 1,
  N = 2,
  NW = 3,
  SW = 4,
  S = 5
}

export const oddq_directions = [
  [[+1, 0], [+1, -1], [0, -1],
  [-1, -1], [-1, 0], [0, +1]],
  [[+1, +1], [+1, 0], [0, -1],
  [-1, 0], [-1, +1], [0, +1]],
];
