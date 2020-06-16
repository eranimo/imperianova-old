import { TerrainType, directionShort, Direction, terrainTypeTitles, terrainBackTransitions } from '../src/mapviewer/constants';
import Jimp from 'jimp';


export enum AutogenColorGroup {
  PRIMARY,
  CENTER,
  SECONDARY,
  CENTER_SECONDARY,
  TERTIARY,
  CENTER_TERTIARY
}

export const autogenColorGroups = [
  AutogenColorGroup.PRIMARY,
  AutogenColorGroup.CENTER,
  AutogenColorGroup.SECONDARY,
  AutogenColorGroup.CENTER_SECONDARY,
  AutogenColorGroup.TERTIARY,
  AutogenColorGroup.CENTER_TERTIARY,
];

export const autogenColors = {
  [AutogenColorGroup.PRIMARY]: [
    Jimp.rgbaToInt(191, 64, 64, 255),
    Jimp.rgbaToInt(204, 102, 102, 255),
    Jimp.rgbaToInt(217, 140, 140, 255),
    Jimp.rgbaToInt(230, 178, 178, 255),
    Jimp.rgbaToInt(243, 217, 217, 255),
  ],
  [AutogenColorGroup.CENTER]: [
    Jimp.rgbaToInt(64, 131, 191, 255),
    Jimp.rgbaToInt(102, 155, 204, 255),
    Jimp.rgbaToInt(140, 180, 217, 255),
    Jimp.rgbaToInt(178, 205, 230, 255),
    Jimp.rgbaToInt(217, 231, 243, 255),
  ],
  [AutogenColorGroup.SECONDARY]: [
    Jimp.rgbaToInt(178, 191, 64, 255),
    Jimp.rgbaToInt(193, 204, 102, 255),
    Jimp.rgbaToInt(209, 217, 140, 255),
    Jimp.rgbaToInt(225, 230, 178, 255),
    Jimp.rgbaToInt(240, 243, 217, 255),
  ],
  [AutogenColorGroup.CENTER_SECONDARY]: [
    Jimp.rgbaToInt(129, 191, 64, 255),
    Jimp.rgbaToInt(154, 204, 102, 255),
    Jimp.rgbaToInt(179, 217, 140, 255),
    Jimp.rgbaToInt(205, 230, 178, 255),
    Jimp.rgbaToInt(230, 243, 217, 255),
  ],
  [AutogenColorGroup.TERTIARY]: [
    Jimp.rgbaToInt(191, 64, 189, 255),
    Jimp.rgbaToInt(204, 102, 203, 255),
    Jimp.rgbaToInt(217, 140, 216, 255),
    Jimp.rgbaToInt(230, 178, 229, 255),
    Jimp.rgbaToInt(243, 217, 243, 255),
  ],
  [AutogenColorGroup.CENTER_TERTIARY]: [
    Jimp.rgbaToInt(64, 191, 186, 255),
    Jimp.rgbaToInt(102, 204, 200, 255),
    Jimp.rgbaToInt(140, 217, 214, 255),
    Jimp.rgbaToInt(178, 230, 228, 255),
    Jimp.rgbaToInt(217, 243, 243, 255),
  ]
};

export const autogenObjectsChance: Partial<Record<TerrainType, number>> = {
  [TerrainType.TUNDRA]: 0.25,
  [TerrainType.FOREST]: 1,
  [TerrainType.TAIGA]: 1,
  [TerrainType.GRASSLAND]: 1,
}

/**
 * 0 = main color
 * 1 = border color
 * 2 = border detail
 * 3 = noise light
 * 4 = noise dark
 */
const oceanColors = [
  Jimp.rgbaToInt(39, 121, 201, 255),
  Jimp.rgbaToInt(107, 182, 210, 255),
  Jimp.rgbaToInt(69, 145, 203, 255),
  Jimp.rgbaToInt(38, 115, 197, 255),
  Jimp.rgbaToInt(39, 121, 201, 255),
];
const oceanRiverTransitionColors = [
  Jimp.rgbaToInt(39, 121, 201, 255),
  Jimp.rgbaToInt(107, 182, 210, 255),
  Jimp.rgbaToInt(69, 145, 203, 255),
  Jimp.rgbaToInt(38, 115, 197, 255),
  Jimp.rgbaToInt(39, 121, 201, 255),
];
const tundraPrimary = Jimp.rgbaToInt(138, 154, 100, 255);
const tundraBorder = Jimp.rgbaToInt(125, 139, 90, 255);
const tundraBorderAccent = Jimp.rgbaToInt(130, 145, 94, 255);
export const autogenTerrainColors: Partial<Record<TerrainType, Partial<Record<TerrainType, number[]>>>> = {
  [TerrainType.OCEAN]: {
    [TerrainType.OCEAN]: oceanColors,
    [TerrainType.GRASSLAND]: oceanColors,
    [TerrainType.FOREST]: oceanColors,
    [TerrainType.DESERT]: oceanColors,
    [TerrainType.TAIGA]: oceanColors,
    [TerrainType.TUNDRA]: oceanColors,
    [TerrainType.GLACIAL]: oceanColors,
    [TerrainType.RIVER]: oceanRiverTransitionColors,
  },
  [TerrainType.RIVER]: {
    [TerrainType.RIVER]: oceanColors,
    [TerrainType.GRASSLAND]: oceanColors,
    [TerrainType.FOREST]: oceanColors,
    [TerrainType.DESERT]: oceanColors,
    [TerrainType.TAIGA]: oceanColors,
    [TerrainType.TUNDRA]: oceanColors,
    [TerrainType.GLACIAL]: oceanColors,
    [TerrainType.OCEAN]: oceanRiverTransitionColors,
  },
  [TerrainType.GRASSLAND]: {
    [TerrainType.GRASSLAND]: [
      Jimp.rgbaToInt(120, 178, 76, 255),
      Jimp.rgbaToInt(247, 226, 107, 255),
      Jimp.rgbaToInt(190, 204, 93, 255),
      Jimp.rgbaToInt(143, 194, 72, 255),
      Jimp.rgbaToInt(108, 160, 68, 255),
    ],
    [TerrainType.OCEAN]: [
      Jimp.rgbaToInt(120, 178, 76, 255),
      Jimp.rgbaToInt(247, 226, 107, 255),
      Jimp.rgbaToInt(190, 204, 93, 255),
      Jimp.rgbaToInt(143, 194, 72, 255),
      Jimp.rgbaToInt(108, 160, 68, 255),
    ],
    [TerrainType.RIVER]: [
      Jimp.rgbaToInt(120, 178, 76, 255),
      Jimp.rgbaToInt(247, 226, 107, 255),
      Jimp.rgbaToInt(190, 204, 93, 255),
      Jimp.rgbaToInt(143, 194, 72, 255),
      Jimp.rgbaToInt(108, 160, 68, 255),
    ],
    [TerrainType.FOREST]: [
      Jimp.rgbaToInt(120, 178, 76, 255),
      Jimp.rgbaToInt(120, 178, 76, 255),
      Jimp.rgbaToInt(120, 178, 76, 255),
      Jimp.rgbaToInt(143, 194, 72, 255),
      Jimp.rgbaToInt(108, 160, 68, 255),
    ],
    [TerrainType.TAIGA]: [
      Jimp.rgbaToInt(120, 178, 76, 255),
      Jimp.rgbaToInt(120, 178, 76, 255),
      Jimp.rgbaToInt(120, 178, 76, 255),
      Jimp.rgbaToInt(143, 194, 72, 255),
      Jimp.rgbaToInt(108, 160, 68, 255),
    ],
    [TerrainType.DESERT]: [
      Jimp.rgbaToInt(120, 178, 76, 255),
      Jimp.rgbaToInt(190, 204, 93, 255),
      Jimp.rgbaToInt(174, 212, 97, 255),
      Jimp.rgbaToInt(143, 194, 72, 255),
      Jimp.rgbaToInt(108, 160, 68, 255),
    ]
  },
  [TerrainType.FOREST]: {
    [TerrainType.FOREST]: [
      Jimp.rgbaToInt(108, 155, 73, 255),
      Jimp.rgbaToInt(89, 135, 55, 255),
      Jimp.rgbaToInt(99, 150, 61, 255),
      Jimp.rgbaToInt(143, 194, 72, 255),
      Jimp.rgbaToInt(108, 160, 68, 255),
    ],
    [TerrainType.DESERT]: [
      Jimp.rgbaToInt(108, 155, 73, 255),
      Jimp.rgbaToInt(190, 204, 93, 255),
      Jimp.rgbaToInt(147, 181, 47, 255),
      Jimp.rgbaToInt(143, 194, 72, 255),
      Jimp.rgbaToInt(108, 160, 68, 255),
    ],
    [TerrainType.OCEAN]: [
      Jimp.rgbaToInt(108, 155, 73, 255),
      Jimp.rgbaToInt(247, 226, 107, 255),
      Jimp.rgbaToInt(190, 204, 93, 255),
      Jimp.rgbaToInt(143, 194, 72, 255),
      Jimp.rgbaToInt(108, 160, 68, 255),
    ],
    [TerrainType.RIVER]: [
      Jimp.rgbaToInt(108, 155, 73, 255),
      Jimp.rgbaToInt(247, 226, 107, 255),
      Jimp.rgbaToInt(190, 204, 93, 255),
      Jimp.rgbaToInt(143, 194, 72, 255),
      Jimp.rgbaToInt(108, 160, 68, 255),
    ],
    [TerrainType.GRASSLAND]: [
      Jimp.rgbaToInt(108, 155, 73, 255),
      Jimp.rgbaToInt(120, 178, 76, 255),
      Jimp.rgbaToInt(120, 178, 76, 255),
      Jimp.rgbaToInt(143, 194, 72, 255),
      Jimp.rgbaToInt(108, 160, 68, 255),
    ],
    [TerrainType.TAIGA]: [
      Jimp.rgbaToInt(108, 155, 73, 255),
      Jimp.rgbaToInt(108, 155, 73, 255),
      Jimp.rgbaToInt(108, 155, 73, 255),
      Jimp.rgbaToInt(143, 194, 72, 255),
      Jimp.rgbaToInt(108, 160, 68, 255),
    ],
    [TerrainType.TUNDRA]: [
      Jimp.rgbaToInt(108, 155, 73, 255),
      Jimp.rgbaToInt(108, 155, 73, 255),
      Jimp.rgbaToInt(108, 155, 73, 255),
      Jimp.rgbaToInt(143, 194, 72, 255),
      Jimp.rgbaToInt(108, 160, 68, 255),
    ],
  },
  [TerrainType.DESERT]: {
    [TerrainType.DESERT]: [
      Jimp.rgbaToInt(233, 216, 121, 255),
      Jimp.rgbaToInt(233, 216, 121, 255),
      Jimp.rgbaToInt(233, 216, 121, 255),
      Jimp.rgbaToInt(224, 208, 114, 255),
      Jimp.rgbaToInt(224, 208, 114, 255),
    ],
    [TerrainType.OCEAN]: [
      Jimp.rgbaToInt(233, 216, 121, 255),
      Jimp.rgbaToInt(228, 207, 91, 255),
      Jimp.rgbaToInt(231, 212, 107, 255),
      Jimp.rgbaToInt(224, 208, 114, 255),
      Jimp.rgbaToInt(224, 208, 114, 255),
    ],
    [TerrainType.RIVER]: [
      Jimp.rgbaToInt(233, 216, 121, 255),
      Jimp.rgbaToInt(228, 207, 91, 255),
      Jimp.rgbaToInt(231, 212, 107, 255),
      Jimp.rgbaToInt(224, 208, 114, 255),
      Jimp.rgbaToInt(224, 208, 114, 255),
    ],
    [TerrainType.GRASSLAND]: [
      Jimp.rgbaToInt(233, 216, 121, 255),
      Jimp.rgbaToInt(228, 207, 91, 255),
      Jimp.rgbaToInt(231, 212, 107, 255),
      Jimp.rgbaToInt(224, 208, 114, 255),
      Jimp.rgbaToInt(224, 208, 114, 255),
    ],
    [TerrainType.FOREST]: [
      Jimp.rgbaToInt(233, 216, 121, 255),
      Jimp.rgbaToInt(228, 207, 91, 255),
      Jimp.rgbaToInt(231, 212, 107, 255),
      Jimp.rgbaToInt(224, 208, 114, 255),
      Jimp.rgbaToInt(224, 208, 114, 255),
    ],
  },
  [TerrainType.TAIGA]: {
    [TerrainType.TAIGA]: [
      Jimp.rgbaToInt(121, 168, 86, 255),
      Jimp.rgbaToInt(233, 216, 121, 255),
      Jimp.rgbaToInt(172, 190, 102, 255),
      Jimp.rgbaToInt(143, 194, 72, 255),
      Jimp.rgbaToInt(108, 160, 68, 255),
    ],
    [TerrainType.OCEAN]: [
      Jimp.rgbaToInt(121, 168, 86, 255),
      Jimp.rgbaToInt(233, 216, 121, 255),
      Jimp.rgbaToInt(172, 190, 102, 255),
      Jimp.rgbaToInt(143, 194, 72, 255),
      Jimp.rgbaToInt(108, 160, 68, 255),
    ],
    [TerrainType.RIVER]: [
      Jimp.rgbaToInt(121, 168, 86, 255),
      Jimp.rgbaToInt(233, 216, 121, 255),
      Jimp.rgbaToInt(172, 190, 102, 255),
      Jimp.rgbaToInt(143, 194, 72, 255),
      Jimp.rgbaToInt(108, 160, 68, 255),
    ],
    [TerrainType.FOREST]: [
      Jimp.rgbaToInt(121, 168, 86, 255),
      Jimp.rgbaToInt(108, 155, 73, 255),
      Jimp.rgbaToInt(111, 159, 75, 255),
      Jimp.rgbaToInt(143, 194, 72, 255),
      Jimp.rgbaToInt(108, 160, 68, 255),
    ],
    [TerrainType.GRASSLAND]: [
      Jimp.rgbaToInt(121, 168, 86, 255),
      Jimp.rgbaToInt(109, 151, 77, 255),
      Jimp.rgbaToInt(109, 151, 77, 255),
      Jimp.rgbaToInt(143, 194, 72, 255),
      Jimp.rgbaToInt(108, 160, 68, 255),
    ],
    [TerrainType.GLACIAL]: [
      Jimp.rgbaToInt(121, 168, 86, 255),
      Jimp.rgbaToInt(109, 151, 77, 255),
      Jimp.rgbaToInt(109, 151, 77, 255),
      Jimp.rgbaToInt(143, 194, 72, 255),
      Jimp.rgbaToInt(108, 160, 68, 255),
    ],
    [TerrainType.TUNDRA]: [
      Jimp.rgbaToInt(121, 168, 86, 255),
      Jimp.rgbaToInt(133, 156, 91, 255),
      Jimp.rgbaToInt(134, 163, 84, 255),
      Jimp.rgbaToInt(143, 194, 72, 255),
      Jimp.rgbaToInt(108, 160, 68, 255),
    ],
  },
  [TerrainType.TUNDRA]: {
    [TerrainType.TUNDRA]: [
      tundraPrimary,
      tundraBorder,
      tundraBorderAccent,
      Jimp.rgbaToInt(118, 138, 77, 255),
      Jimp.rgbaToInt(118, 138, 77, 255),
    ],
    [TerrainType.GLACIAL]: [
      tundraPrimary,
      tundraBorder,
      tundraBorderAccent,
      Jimp.rgbaToInt(118, 138, 77, 255),
      Jimp.rgbaToInt(118, 138, 77, 255),
    ],
    [TerrainType.GLACIAL]: [
      tundraPrimary,
      tundraBorder,
      tundraBorderAccent,
      Jimp.rgbaToInt(118, 138, 77, 255),
      Jimp.rgbaToInt(118, 138, 77, 255),
    ],
    [TerrainType.OCEAN]: [
      tundraPrimary,
      tundraBorder,
      tundraBorderAccent,
      Jimp.rgbaToInt(118, 138, 77, 255),
      Jimp.rgbaToInt(118, 138, 77, 255),
    ],
    [TerrainType.RIVER]: [
      tundraPrimary,
      tundraBorder,
      tundraBorderAccent,
      Jimp.rgbaToInt(118, 138, 77, 255),
      Jimp.rgbaToInt(118, 138, 77, 255),
    ],
    [TerrainType.TAIGA]: [
      tundraPrimary,
      tundraBorder,
      tundraBorderAccent,
      Jimp.rgbaToInt(118, 138, 77, 255),
      Jimp.rgbaToInt(118, 138, 77, 255),
    ],
  },
  [TerrainType.GLACIAL]: {
    [TerrainType.GLACIAL]: [
      Jimp.rgbaToInt(242, 242, 242, 255),
      Jimp.rgbaToInt(235, 239, 245, 255),
      Jimp.rgbaToInt(237, 241, 246, 255),
      Jimp.rgbaToInt(229, 237, 255, 255),
      Jimp.rgbaToInt(229, 237, 255, 255),
    ],
    [TerrainType.OCEAN]: [
      Jimp.rgbaToInt(242, 242, 242, 255),
      Jimp.rgbaToInt(235, 239, 245, 255),
      Jimp.rgbaToInt(237, 241, 246, 255),
      Jimp.rgbaToInt(229, 237, 255, 255),
      Jimp.rgbaToInt(229, 237, 255, 255),
    ],
    [TerrainType.RIVER]: [
      Jimp.rgbaToInt(242, 242, 242, 255),
      Jimp.rgbaToInt(235, 239, 245, 255),
      Jimp.rgbaToInt(237, 241, 246, 255),
      Jimp.rgbaToInt(229, 237, 255, 255),
      Jimp.rgbaToInt(229, 237, 255, 255),
    ],
    [TerrainType.TAIGA]: [
      Jimp.rgbaToInt(242, 242, 242, 255),
      Jimp.rgbaToInt(235, 239, 245, 255),
      Jimp.rgbaToInt(237, 241, 246, 255),
      Jimp.rgbaToInt(229, 237, 255, 255),
      Jimp.rgbaToInt(229, 237, 255, 255),
    ],
    [TerrainType.TUNDRA]: [
      Jimp.rgbaToInt(242, 242, 242, 255),
      Jimp.rgbaToInt(235, 239, 245, 255),
      Jimp.rgbaToInt(237, 241, 246, 255),
      Jimp.rgbaToInt(229, 237, 255, 255),
      Jimp.rgbaToInt(229, 237, 255, 255),
    ],
  },
};
export const getAutogenSettings = (
  terrainType: TerrainType,
  terrainTypeCenter: TerrainType,
  adj1TerrainType: TerrainType,
  adj2TerrainType: TerrainType,
  direction: Direction,
  templateDirectionCoords: Record<Direction, { x: number, y: number }>,
  tileWidth: number,
) => {
  let group: number;
  let colorsTerrainMap: Partial<Record<AutogenColorGroup, TerrainType>> = {};
  let colorsTerrainMapAdj: Partial<Record<AutogenColorGroup, TerrainType>> = {};
  if (
    // all equal
    terrainTypeCenter === terrainType &&
    terrainTypeCenter === adj1TerrainType &&
    terrainTypeCenter === adj2TerrainType) {
    group = 0;
  }
  else if (
    // terrainTypeCenter = adj1 = adj2 / terrainType
    adj1TerrainType === adj2TerrainType &&
    adj1TerrainType === terrainType &&
    terrainType !== terrainTypeCenter) {
    group = 1;
  }
  else if (adj1TerrainType === adj2TerrainType &&
    adj1TerrainType === terrainTypeCenter &&
    terrainType !== terrainTypeCenter) {
    group = 2;
  }
  else if (terrainTypeCenter === adj1TerrainType &&
    terrainTypeCenter !== terrainType &&
    terrainType === adj2TerrainType) {
    group = 3;
  }
  else if (terrainTypeCenter !== terrainType &&
    terrainType === adj1TerrainType
    &&
    adj1TerrainType !== adj2TerrainType &&
    adj2TerrainType === terrainTypeCenter) {
    group = 4;
  }
  else if (adj1TerrainType === adj2TerrainType &&
    adj1TerrainType !== terrainType &&
    terrainType === terrainTypeCenter) {
    group = 5;
  }
  else if (adj1TerrainType !== terrainType &&
    terrainType === terrainTypeCenter &&
    terrainType === adj2TerrainType) {
    group = 6;
  }
  else if (adj2TerrainType !== adj1TerrainType &&
    terrainType === terrainTypeCenter &&
    adj1TerrainType === terrainType) {
    group = 7;
  }
  else if (adj1TerrainType !== adj2TerrainType &&
    terrainType === terrainTypeCenter &&
    adj1TerrainType !== terrainType &&
    adj2TerrainType !== terrainType) {
    group = 8;
  }
  else if (terrainType !== terrainTypeCenter &&
    adj1TerrainType === adj2TerrainType &&
    adj1TerrainType !== terrainType &&
    adj1TerrainType !== terrainTypeCenter &&
    adj2TerrainType !== terrainType &&
    adj2TerrainType !== terrainTypeCenter) {
    group = 9; // like 2
    if (terrainBackTransitions[terrainType] && terrainBackTransitions[terrainType].includes(adj1TerrainType)) {
      group = 2;
    }
  }
  else if (adj2TerrainType === terrainType &&
    adj1TerrainType !== terrainTypeCenter &&
    adj1TerrainType !== adj2TerrainType) {
    group = 10; // like 3
    if (terrainBackTransitions[terrainType] && terrainBackTransitions[terrainType].includes(adj1TerrainType)) {
      group = 3;
    }
  }
  else if (adj1TerrainType === terrainType &&
    adj2TerrainType !== terrainTypeCenter &&
    adj2TerrainType !== adj1TerrainType) {
    group = 11; // like 4
    if (terrainBackTransitions[terrainType] && terrainBackTransitions[terrainType].includes(adj2TerrainType)) {
      group = 4;
    }
  }
  else if (terrainType !== terrainTypeCenter &&
    adj1TerrainType === terrainTypeCenter &&
    adj1TerrainType !== adj2TerrainType &&
    adj2TerrainType !== terrainTypeCenter) {
    group = 12;
    if (terrainBackTransitions[terrainType] && terrainBackTransitions[terrainType].includes(adj2TerrainType)) {
      group = 4;
    }
  }
  else if (terrainType !== terrainTypeCenter &&
    adj2TerrainType === terrainTypeCenter &&
    adj2TerrainType !== adj1TerrainType &&
    adj1TerrainType !== terrainTypeCenter) {
    group = 13;
    if (terrainBackTransitions[terrainType] && terrainBackTransitions[terrainType].includes(adj1TerrainType)) {
      group = 3;
    }
  }
  else if (terrainType !== terrainTypeCenter &&
    adj1TerrainType !== adj2TerrainType &&
    adj1TerrainType !== terrainType &&
    adj1TerrainType !== terrainTypeCenter &&
    adj2TerrainType !== terrainType &&
    adj2TerrainType !== terrainTypeCenter) {
    group = 14;
    const isTransitionAdj1 = terrainBackTransitions[terrainType] && terrainBackTransitions[terrainType].includes(adj1TerrainType);
    const isTransitionAdj2 = terrainBackTransitions[terrainType] && terrainBackTransitions[terrainType].includes(adj2TerrainType);
    if (isTransitionAdj1 && isTransitionAdj2) {
      group = 2;
    }
    else if (isTransitionAdj1) {
      group = 11;
    }
    else if (isTransitionAdj2) {
      group = 10;
    }
  }

  if (group === 0) {
    colorsTerrainMap[AutogenColorGroup.PRIMARY] = terrainType;
  }
  else if (group === 1) {
    colorsTerrainMap[AutogenColorGroup.PRIMARY] = terrainType;
    colorsTerrainMap[AutogenColorGroup.CENTER] = terrainTypeCenter;
    colorsTerrainMapAdj[AutogenColorGroup.PRIMARY] = terrainTypeCenter;
    colorsTerrainMapAdj[AutogenColorGroup.CENTER] = terrainType;
  }
  else if (group === 2) {
    colorsTerrainMap[AutogenColorGroup.PRIMARY] = terrainType;
    colorsTerrainMap[AutogenColorGroup.CENTER] = terrainTypeCenter;
    colorsTerrainMapAdj[AutogenColorGroup.PRIMARY] = terrainTypeCenter;
    colorsTerrainMapAdj[AutogenColorGroup.CENTER] = terrainType;
  }
  else if (group === 3) {
    colorsTerrainMap[AutogenColorGroup.PRIMARY] = terrainType;
    colorsTerrainMap[AutogenColorGroup.CENTER] = terrainTypeCenter;
    colorsTerrainMapAdj[AutogenColorGroup.PRIMARY] = terrainTypeCenter;
    colorsTerrainMapAdj[AutogenColorGroup.CENTER] = terrainType;
  }
  else if (group === 4) {
    colorsTerrainMap[AutogenColorGroup.PRIMARY] = terrainType;
    colorsTerrainMap[AutogenColorGroup.CENTER] = terrainTypeCenter;
    colorsTerrainMapAdj[AutogenColorGroup.PRIMARY] = terrainTypeCenter;
    colorsTerrainMapAdj[AutogenColorGroup.CENTER] = terrainType;
  }
  else if (group === 5) {
    colorsTerrainMap[AutogenColorGroup.PRIMARY] = adj1TerrainType;
    colorsTerrainMap[AutogenColorGroup.CENTER] = terrainTypeCenter;
    colorsTerrainMapAdj[AutogenColorGroup.PRIMARY] = terrainTypeCenter;
    colorsTerrainMapAdj[AutogenColorGroup.CENTER] = adj1TerrainType;
  }
  else if (group === 6) {
    colorsTerrainMap[AutogenColorGroup.PRIMARY] = adj1TerrainType;
    colorsTerrainMap[AutogenColorGroup.CENTER] = terrainTypeCenter;
    colorsTerrainMapAdj[AutogenColorGroup.PRIMARY] = terrainTypeCenter;
    colorsTerrainMapAdj[AutogenColorGroup.CENTER] = adj1TerrainType;
  }
  else if (group === 7) {
    colorsTerrainMap[AutogenColorGroup.PRIMARY] = adj2TerrainType;
    colorsTerrainMap[AutogenColorGroup.CENTER] = terrainTypeCenter;
    colorsTerrainMapAdj[AutogenColorGroup.PRIMARY] = terrainTypeCenter;
    colorsTerrainMapAdj[AutogenColorGroup.CENTER] = adj2TerrainType;
  }
  else if (group === 8) {
    colorsTerrainMap[AutogenColorGroup.PRIMARY] = adj2TerrainType;
    colorsTerrainMap[AutogenColorGroup.CENTER] = terrainTypeCenter;
    colorsTerrainMap[AutogenColorGroup.SECONDARY] = adj1TerrainType;
    colorsTerrainMap[AutogenColorGroup.CENTER_SECONDARY] = terrainTypeCenter;
    colorsTerrainMapAdj[AutogenColorGroup.PRIMARY] = terrainTypeCenter;
    colorsTerrainMapAdj[AutogenColorGroup.CENTER] = adj2TerrainType;
    colorsTerrainMapAdj[AutogenColorGroup.SECONDARY] = terrainTypeCenter;
    colorsTerrainMapAdj[AutogenColorGroup.CENTER_SECONDARY] = adj1TerrainType;
  }
  else if (group === 9) {
    colorsTerrainMap[AutogenColorGroup.PRIMARY] = terrainType;
    colorsTerrainMap[AutogenColorGroup.CENTER] = terrainTypeCenter;
    colorsTerrainMap[AutogenColorGroup.SECONDARY] = adj2TerrainType;
    colorsTerrainMap[AutogenColorGroup.CENTER_SECONDARY] = terrainTypeCenter;
    colorsTerrainMapAdj[AutogenColorGroup.PRIMARY] = terrainTypeCenter;
    colorsTerrainMapAdj[AutogenColorGroup.CENTER] = terrainType;
    colorsTerrainMapAdj[AutogenColorGroup.SECONDARY] = terrainTypeCenter;
    colorsTerrainMapAdj[AutogenColorGroup.CENTER_SECONDARY] = adj2TerrainType;
  }
  else if (group === 10) {
    colorsTerrainMap[AutogenColorGroup.PRIMARY] = terrainType;
    colorsTerrainMap[AutogenColorGroup.CENTER] = terrainTypeCenter;
    colorsTerrainMap[AutogenColorGroup.SECONDARY] = adj1TerrainType;
    colorsTerrainMap[AutogenColorGroup.CENTER_SECONDARY] = terrainTypeCenter;
    colorsTerrainMapAdj[AutogenColorGroup.PRIMARY] = terrainTypeCenter;
    colorsTerrainMapAdj[AutogenColorGroup.CENTER] = terrainType;
    colorsTerrainMapAdj[AutogenColorGroup.SECONDARY] = terrainTypeCenter;
    colorsTerrainMapAdj[AutogenColorGroup.CENTER_SECONDARY] = adj1TerrainType;
  }
  else if (group === 11) {
    colorsTerrainMap[AutogenColorGroup.PRIMARY] = terrainType;
    colorsTerrainMap[AutogenColorGroup.CENTER] = terrainTypeCenter;
    colorsTerrainMap[AutogenColorGroup.SECONDARY] = adj2TerrainType;
    colorsTerrainMap[AutogenColorGroup.CENTER_SECONDARY] = terrainTypeCenter;
    colorsTerrainMapAdj[AutogenColorGroup.PRIMARY] = terrainTypeCenter;
    colorsTerrainMapAdj[AutogenColorGroup.CENTER] = terrainType;
    colorsTerrainMapAdj[AutogenColorGroup.SECONDARY] = terrainTypeCenter;
    colorsTerrainMapAdj[AutogenColorGroup.CENTER_SECONDARY] = adj2TerrainType;
  }
  else if (group === 12) {
    colorsTerrainMap[AutogenColorGroup.PRIMARY] = terrainType;
    colorsTerrainMap[AutogenColorGroup.CENTER] = terrainTypeCenter;
    colorsTerrainMap[AutogenColorGroup.SECONDARY] = adj2TerrainType;
    colorsTerrainMap[AutogenColorGroup.CENTER_SECONDARY] = terrainTypeCenter;
    colorsTerrainMapAdj[AutogenColorGroup.PRIMARY] = terrainTypeCenter;
    colorsTerrainMapAdj[AutogenColorGroup.CENTER] = terrainType;
    colorsTerrainMapAdj[AutogenColorGroup.SECONDARY] = terrainTypeCenter;
    colorsTerrainMapAdj[AutogenColorGroup.CENTER_SECONDARY] = adj2TerrainType;
  }
  else if (group === 13) {
    colorsTerrainMap[AutogenColorGroup.PRIMARY] = terrainType;
    colorsTerrainMap[AutogenColorGroup.CENTER] = terrainTypeCenter;
    colorsTerrainMap[AutogenColorGroup.SECONDARY] = adj1TerrainType;
    colorsTerrainMap[AutogenColorGroup.CENTER_SECONDARY] = terrainTypeCenter;
    colorsTerrainMapAdj[AutogenColorGroup.PRIMARY] = terrainTypeCenter;
    colorsTerrainMapAdj[AutogenColorGroup.CENTER] = terrainType;
    colorsTerrainMapAdj[AutogenColorGroup.SECONDARY] = terrainTypeCenter;
    colorsTerrainMapAdj[AutogenColorGroup.CENTER_SECONDARY] = adj1TerrainType;
  }
  else if (group === 14) {
    colorsTerrainMap[AutogenColorGroup.PRIMARY] = terrainType;
    colorsTerrainMap[AutogenColorGroup.CENTER] = terrainTypeCenter;
    colorsTerrainMap[AutogenColorGroup.SECONDARY] = adj1TerrainType;
    colorsTerrainMap[AutogenColorGroup.CENTER_SECONDARY] = terrainTypeCenter;
    colorsTerrainMap[AutogenColorGroup.TERTIARY] = adj2TerrainType;
    colorsTerrainMap[AutogenColorGroup.CENTER_TERTIARY] = terrainTypeCenter;
    colorsTerrainMapAdj[AutogenColorGroup.PRIMARY] = terrainTypeCenter;
    colorsTerrainMapAdj[AutogenColorGroup.CENTER] = terrainType;
    colorsTerrainMapAdj[AutogenColorGroup.SECONDARY] = terrainTypeCenter;
    colorsTerrainMapAdj[AutogenColorGroup.CENTER_SECONDARY] = adj1TerrainType;
    colorsTerrainMapAdj[AutogenColorGroup.TERTIARY] = terrainTypeCenter;
    colorsTerrainMapAdj[AutogenColorGroup.CENTER_TERTIARY] = adj2TerrainType;
  }
  else {
    console.error('terrainType:', terrainTypeTitles[terrainType]);
    console.error('terrainTypeCenter:', terrainTypeTitles[terrainTypeCenter]);
    console.error('adj1TerrainType:', terrainTypeTitles[adj1TerrainType]);
    console.error('adj2TerrainType:', terrainTypeTitles[adj2TerrainType]);
    console.error('direction:', directionShort[direction]);
    throw new Error(`Could not find autogen group`);
  }
  return {
    group,
    coord: {
      x: templateDirectionCoords[direction].x + (group * 3 * tileWidth),
      y: templateDirectionCoords[direction].y,
    },
    colorsTerrainMap,
    colorsTerrainMapAdj,
  };
};
