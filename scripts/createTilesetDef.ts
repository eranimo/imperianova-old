#!/usr/bin/env ts-node-script

import path from 'path';
import fs from 'fs';
import { parseStringPromise, Builder } from 'xml2js';
import yargs, { number, boolean } from 'yargs';
import { TerrainType, terrainTypeMax, directionShort, Direction, terrainColors, terrainMinimapColors, terrainTransitions, terrainTypeTitles, terrainBackTransitions } from '../src/mapviewer/constants';
import { renderOrder, adjacentDirections, newImage, SectionalTile, getFilePath, indexOrder, propertyTypeProcess } from './shared';
import Jimp from 'jimp';
import { forEach, random } from 'lodash';


yargs.command('* <tilesetDefName>', 'Builds tileset definition xml file');

const argv = yargs.options({
  outputPath: {
    type: 'string',
    description: 'Output folder for tileset def',
    alias: 'o',
    default: './',
  },
  outputExtension: {
    type: 'string',
    description: 'Output file extension',
    alias: 'e',
    default: 'xml',
  },
}).argv;

const xmlBuilder = new Builder();

const tileWidth = 32;
const tileHeight = 48;

const templateDirectionCoords: Record<Direction, { x: number, y: number}> = {
  [Direction.N]: { x: 0, y: 0 },
  [Direction.NE]: { x: 1 * tileWidth, y: 0 },
  [Direction.SE]: { x: 2 * tileWidth, y: 0 },
  [Direction.S]: { x: 0, y: 1 * tileHeight },
  [Direction.SW]: { x: 1 * tileWidth, y: 1 * tileHeight },
  [Direction.NW]: { x: 2 * tileWidth, y: 1 * tileHeight },
}

enum AutogenColorGroup {
  PRIMARY,
  CENTER,
  SECONDARY,
  CENTER_SECONDARY,
}
const autogenColorGroups = [
  AutogenColorGroup.PRIMARY,
  AutogenColorGroup.CENTER,
  AutogenColorGroup.SECONDARY,
  AutogenColorGroup.CENTER_SECONDARY,
];

const autogenColors = {
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
  ]
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
  Jimp.rgbaToInt(39, 121, 201, 255), // same as 0
  Jimp.rgbaToInt(38, 115, 197, 255),
];
const autogenTerrainColors: Partial<Record<TerrainType, Partial<Record<TerrainType, number[]>>>> = {
  [TerrainType.OCEAN]: {
    [TerrainType.OCEAN]: oceanColors,
    [TerrainType.GRASSLAND]: oceanColors,
    [TerrainType.FOREST]: oceanColors,
    [TerrainType.DESERT]: oceanColors,
    [TerrainType.TAIGA]: oceanColors,
    [TerrainType.TUNDRA]: oceanColors,
    [TerrainType.GLACIAL]: oceanColors,
  },
  [TerrainType.GRASSLAND]: {
    [TerrainType.GRASSLAND]: [
      Jimp.rgbaToInt(120, 178, 76, 255),
      Jimp.rgbaToInt(247, 226, 107, 255), // beach
      Jimp.rgbaToInt(190, 204, 93, 255),
      Jimp.rgbaToInt(143, 194, 72, 255),
      Jimp.rgbaToInt(108, 160, 68, 255),
    ],
    [TerrainType.OCEAN]: [
      Jimp.rgbaToInt(120, 178, 76, 255),
      Jimp.rgbaToInt(247, 226, 107, 255), // beach
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
      Jimp.rgbaToInt(120, 178, 76, 255),
      Jimp.rgbaToInt(89, 135, 55, 255),
      Jimp.rgbaToInt(99, 150, 61, 255),
      Jimp.rgbaToInt(143, 194, 72, 255),
      Jimp.rgbaToInt(108, 160, 68, 255),
    ],
    [TerrainType.OCEAN]: [
      Jimp.rgbaToInt(120, 178, 76, 255),
      Jimp.rgbaToInt(247, 226, 107, 255), // beach
      Jimp.rgbaToInt(190, 204, 93, 255),
      Jimp.rgbaToInt(143, 194, 72, 255),
      Jimp.rgbaToInt(108, 160, 68, 255),
    ],
    [TerrainType.GRASSLAND]: [
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
  },
  [TerrainType.DESERT]: {
    [TerrainType.DESERT]: [0xD9BF8CFF, 0xD9BF8CFF, 0xD9BF8CFF, 0xD9BF8CFF, 0xD9BF8CFF],
    [TerrainType.OCEAN]: [0xD9BF8CFF, 0xD9BF8CFF, 0xD9BF8CFF, 0xD9BF8CFF, 0xD9BF8CFF],
    [TerrainType.GRASSLAND]: [0xD9BF8CFF, 0xD9BF8CFF, 0xD9BF8CFF, 0xD9BF8CFF, 0xD9BF8CFF],
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
    [TerrainType.FOREST]: [
      Jimp.rgbaToInt(121, 168, 86, 255),
      Jimp.rgbaToInt(109, 151, 77, 255),
      Jimp.rgbaToInt(109, 151, 77, 255),
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
    [TerrainType.GLACIAL]: [0x006259FF, 0x006259FF, 0x006259FF, 0x006259FF, 0x006259FF],
    [TerrainType.TUNDRA]: [0x006259FF, 0x006259FF, 0x006259FF, 0x006259FF, 0x006259FF],
  },
  [TerrainType.TUNDRA]: {
    [TerrainType.TUNDRA]: [0x96D1C3FF, 0x96D1C3FF, 0x96D1C3FF, 0x96D1C3FF, 0x96D1C3FF],
    [TerrainType.OCEAN]: [0x96D1C3FF, 0x96D1C3FF, 0x96D1C3FF, 0x96D1C3FF, 0x96D1C3FF],
    [TerrainType.TAIGA]: [0x96D1C3FF, 0x96D1C3FF, 0x96D1C3FF, 0x96D1C3FF, 0x96D1C3FF],
  },
  [TerrainType.GLACIAL]: {
    [TerrainType.GLACIAL]: [0xFAFAFAFF, 0xFAFAFAFF, 0xFAFAFAFF, 0xFAFAFAFF, 0xFAFAFAFF],
    [TerrainType.OCEAN]: [0xFAFAFAFF, 0xFAFAFAFF, 0xFAFAFAFF, 0xFAFAFAFF, 0xFAFAFAFF],
    [TerrainType.TAIGA]: [0xFAFAFAFF, 0xFAFAFAFF, 0xFAFAFAFF, 0xFAFAFAFF, 0xFAFAFAFF],
  },
}

const getAutogenSettings = (
  terrainType: TerrainType,
  terrainTypeCenter: TerrainType,
  adj1TerrainType: TerrainType,
  adj2TerrainType: TerrainType,
  direction: Direction,
) => {
  let group: number;
  let colorsTerrainMap: Partial<Record<AutogenColorGroup, TerrainType>> = {};
  let colorsTerrainMapAdj: Partial<Record<AutogenColorGroup, TerrainType>> = {};
  if (
    // all equal
    terrainTypeCenter === terrainType && 
    terrainTypeCenter === adj1TerrainType &&
    terrainTypeCenter === adj2TerrainType
  ) {
    group = 0;
    colorsTerrainMap[AutogenColorGroup.PRIMARY] = terrainType;
  } else if (
    // terrainTypeCenter = adj1 = adj2 / terrainType
    adj1TerrainType === adj2TerrainType &&
    adj1TerrainType === terrainType &&
    terrainType !== terrainTypeCenter
  ) {
    group = 1;
    colorsTerrainMap[AutogenColorGroup.PRIMARY] = terrainType;
    colorsTerrainMap[AutogenColorGroup.CENTER] = terrainTypeCenter;
    colorsTerrainMapAdj[AutogenColorGroup.PRIMARY] = terrainTypeCenter;
    colorsTerrainMapAdj[AutogenColorGroup.CENTER] = terrainType;
  } else if (
    adj1TerrainType === adj2TerrainType &&
    adj1TerrainType === terrainTypeCenter &&
    terrainType !== terrainTypeCenter
  ) {
    group = 2;
    colorsTerrainMap[AutogenColorGroup.PRIMARY] = terrainType;
    colorsTerrainMap[AutogenColorGroup.CENTER] = terrainTypeCenter;
    colorsTerrainMapAdj[AutogenColorGroup.PRIMARY] = terrainTypeCenter;
    colorsTerrainMapAdj[AutogenColorGroup.CENTER] = terrainType;
  } else if (
    terrainTypeCenter === adj1TerrainType &&
    terrainTypeCenter !== terrainType && 
    terrainType === adj2TerrainType
  ) {
    group = 3;
    colorsTerrainMap[AutogenColorGroup.PRIMARY] = terrainType;
    colorsTerrainMap[AutogenColorGroup.CENTER] = terrainTypeCenter;
    colorsTerrainMapAdj[AutogenColorGroup.PRIMARY] = terrainTypeCenter;
    colorsTerrainMapAdj[AutogenColorGroup.CENTER] = terrainType;
  } else if (
    terrainTypeCenter !== terrainType &&
    terrainType === adj1TerrainType
  ) {
    group = 4;
    colorsTerrainMap[AutogenColorGroup.PRIMARY] = terrainType;
    colorsTerrainMap[AutogenColorGroup.CENTER] = terrainTypeCenter;
    colorsTerrainMapAdj[AutogenColorGroup.PRIMARY] = terrainTypeCenter;
    colorsTerrainMapAdj[AutogenColorGroup.CENTER] = terrainType;
  } else if (
    adj1TerrainType === adj2TerrainType &&
    adj1TerrainType !== terrainType &&
    terrainType === terrainTypeCenter
  ) {
    group = 5;
    colorsTerrainMap[AutogenColorGroup.PRIMARY] = adj1TerrainType;
    colorsTerrainMap[AutogenColorGroup.CENTER] = terrainTypeCenter;
    colorsTerrainMapAdj[AutogenColorGroup.PRIMARY] = terrainTypeCenter;
    colorsTerrainMapAdj[AutogenColorGroup.CENTER] = adj1TerrainType;
  } else if (
    adj1TerrainType !== terrainType &&
    terrainType === terrainTypeCenter &&
    terrainType === adj2TerrainType
  ) {
    group = 6;
    colorsTerrainMap[AutogenColorGroup.PRIMARY] = adj1TerrainType;
    colorsTerrainMap[AutogenColorGroup.CENTER] = terrainTypeCenter;
    colorsTerrainMapAdj[AutogenColorGroup.PRIMARY] = terrainTypeCenter;
    colorsTerrainMapAdj[AutogenColorGroup.CENTER] = adj1TerrainType;
  } else if (
    adj2TerrainType !== adj1TerrainType &&
    terrainType === terrainTypeCenter &&
    adj1TerrainType === terrainType
  ) {
    group = 7;
    colorsTerrainMap[AutogenColorGroup.PRIMARY] = adj1TerrainType;
    colorsTerrainMap[AutogenColorGroup.CENTER] = terrainTypeCenter;
    colorsTerrainMapAdj[AutogenColorGroup.PRIMARY] = terrainTypeCenter;
    colorsTerrainMapAdj[AutogenColorGroup.CENTER] = adj1TerrainType;
  } else if (
    adj1TerrainType !== adj2TerrainType &&
    terrainType === terrainTypeCenter &&
    adj1TerrainType !== terrainType &&
    adj2TerrainType !== terrainType
  ) {
    group = 8;
    colorsTerrainMap[AutogenColorGroup.PRIMARY] = adj2TerrainType;
    colorsTerrainMap[AutogenColorGroup.CENTER] = terrainTypeCenter;
    colorsTerrainMap[AutogenColorGroup.SECONDARY] = adj1TerrainType;
    colorsTerrainMap[AutogenColorGroup.CENTER_SECONDARY] = terrainTypeCenter;
    colorsTerrainMapAdj[AutogenColorGroup.PRIMARY] = terrainTypeCenter;
    colorsTerrainMapAdj[AutogenColorGroup.CENTER] = adj2TerrainType;
    colorsTerrainMapAdj[AutogenColorGroup.SECONDARY] = terrainTypeCenter;
    colorsTerrainMapAdj[AutogenColorGroup.CENTER_SECONDARY] = adj1TerrainType;
  } else if (
    terrainType !== terrainTypeCenter &&
    adj1TerrainType !== terrainType &&
    adj2TerrainType !== terrainType
  ) {
    group = 2;
    colorsTerrainMap[AutogenColorGroup.PRIMARY] = terrainType;
    colorsTerrainMap[AutogenColorGroup.CENTER] = terrainTypeCenter;
    colorsTerrainMapAdj[AutogenColorGroup.PRIMARY] = terrainTypeCenter;
    colorsTerrainMapAdj[AutogenColorGroup.CENTER] = terrainType;
  } else if (
    adj2TerrainType === terrainType &&
    adj1TerrainType !== terrainTypeCenter &&
    adj1TerrainType !== adj2TerrainType
  ) {
    group = 3;
    colorsTerrainMap[AutogenColorGroup.PRIMARY] = terrainType;
    colorsTerrainMap[AutogenColorGroup.CENTER] = terrainTypeCenter;
    colorsTerrainMapAdj[AutogenColorGroup.PRIMARY] = terrainTypeCenter;
    colorsTerrainMapAdj[AutogenColorGroup.CENTER] = terrainType;
  } else if (
    adj1TerrainType === terrainType &&
    adj2TerrainType !== terrainTypeCenter &&
    adj2TerrainType !== adj1TerrainType
  ) {
    group = 4;
    colorsTerrainMap[AutogenColorGroup.PRIMARY] = terrainType;
    colorsTerrainMap[AutogenColorGroup.CENTER] = terrainTypeCenter;
    colorsTerrainMapAdj[AutogenColorGroup.PRIMARY] = terrainTypeCenter;
    colorsTerrainMapAdj[AutogenColorGroup.CENTER] = terrainType;
  }
  // if (group === undefined) {
  //   console.log({
  //     terrainType,
  //     terrainTypeCenter,
  //     adj1TerrainType,
  //     adj2TerrainType,
  //     direction,
  //   })
  //   throw new Error('Invalid tileset configuration');
  // }
  return {
    group,
    coord: {
      x: templateDirectionCoords[direction].x + (group * 3 * tileWidth),
      y: templateDirectionCoords[direction].y,
    },
    colorsTerrainMap,
    colorsTerrainMapAdj,
  };
}

enum TemplateColor {
  TERRAIN_TYPE = Jimp.rgbaToInt(255, 0, 0, 255),
  TERRAIN_TYPE_CENTER = Jimp.rgbaToInt(0, 255, 0, 255),
  TERRAIN_TYPE_ADJ_1 = Jimp.rgbaToInt(255, 0, 255, 255),
  TERRAIN_TYPE_ADJ_2 = Jimp.rgbaToInt(255, 255, 0, 255),
}

type AutogenObject = {
  tileID: number;
  size: number;
  terrainTypes: TerrainType[];
  used?: boolean;
  x: number;
  y: number;
}

async function getAutogenObjects() {
  const xmlFilePath = getFilePath('src', 'assets', 'autogen-objects.xml');
  const xmlFileRaw = fs.readFileSync(xmlFilePath, { encoding: 'utf-8' });
  const xmlFile = await parseStringPromise(xmlFileRaw);

  const columns = parseInt(xmlFile.tileset.$.columns, 10);
  const tileWidth = parseInt(xmlFile.tileset.$.tilewidth, 10);
  const tileHeight = parseInt(xmlFile.tileset.$.tileheight, 10);

  const autogenObjects: AutogenObject[] = [];
  const objectsForTerrainType: Map<TerrainType, AutogenObject[]> = new Map();

  for (const rawTile of xmlFile.tileset.tile) {
    const tileID = parseInt(rawTile.$.id, 10);
    let autogenObject: AutogenObject = {
      tileID,
      size: 0,
      terrainTypes: [],
      x: (tileID % columns) * tileWidth,
      y: (Math.floor(tileID / columns)) * tileHeight,
    };
    rawTile.properties.forEach(i => i.property.forEach(({ $ }) => {
      if ($.name === 'terrainTypes') {
        autogenObject[$.name] = ($.value as string).split(',').map(v => parseInt(v, 10) as TerrainType);
      } else {
        autogenObject[$.name] = propertyTypeProcess[$.type || 'str']($.value);
      }
    }));
    if (!autogenObject.used) {
      continue;
    }
    autogenObjects.push(autogenObject);
    for (const terrainType of autogenObject.terrainTypes) {
      if (objectsForTerrainType.has(terrainType)) {
        objectsForTerrainType.get(terrainType).push(autogenObject);
      } else {
        objectsForTerrainType.set(terrainType, [autogenObject]);
      }
    }
  }

  console.log(`Loaded ${autogenObjects.length} autogen objects`);
  return { autogenObjects, objectsForTerrainType };
}

async function buildTemplateTileset(
  template: Jimp,
  autogenTemplate: Jimp,
  tiles: SectionalTile[],
  columns: number,
  rows: number,
) {
  const autogenObjectsTileset = await Jimp.read(getFilePath('src', 'assets', 'autogen-objects.png'));
  const { autogenObjects, objectsForTerrainType } = await getAutogenObjects();
  const getRandomObject = (terrainType: TerrainType) => {
    const objects = objectsForTerrainType.get(terrainType);
    if (!objects) return null;
    return objects[random(objects.length - 1)];
  }
  const outTemplate = await newImage(columns * tileWidth, rows * tileHeight);
  const outTileset = await newImage(columns * tileWidth, rows * tileHeight);
  tiles.forEach((tile, index) => {
    const templateTile = templateDirectionCoords[tile.direction]
    const tx = (index % columns) * tileWidth;
    const ty = (Math.floor(index / columns)) * tileHeight;
    outTemplate.blit(template, tx, ty, templateTile.x, templateTile.y, tileWidth, tileHeight);
    outTemplate.scan(tx, ty, tileWidth, tileHeight, (x, y) => {
      const color = outTemplate.getPixelColor(x, y);
      if (color === TemplateColor.TERRAIN_TYPE) {
        const newColor = terrainMinimapColors[tile.terrainType];
        outTemplate.setPixelColor(Jimp.cssColorToHex(newColor), x, y);
      } else if (color === TemplateColor.TERRAIN_TYPE_CENTER) {
        const newColor = terrainMinimapColors[tile.terrainTypeCenter];
        outTemplate.setPixelColor(Jimp.cssColorToHex(newColor), x, y);
      } else if (color === TemplateColor.TERRAIN_TYPE_ADJ_1) {
        const adj_1 = adjacentDirections[tile.direction][0];
        const newColor = terrainMinimapColors[tile[`terrainType${directionShort[adj_1]}`]];
        outTemplate.setPixelColor(Jimp.cssColorToHex(newColor), x, y);
      } else if (color === TemplateColor.TERRAIN_TYPE_ADJ_2) {
        const adj_2 = adjacentDirections[tile.direction][1];
        const newColor = terrainMinimapColors[tile[`terrainType${directionShort[adj_2]}`]];
        outTemplate.setPixelColor(Jimp.cssColorToHex(newColor), x, y);
      }
    });

    // autogen
    const adj1 = tile[`terrainType${directionShort[adjacentDirections[tile.direction][0]]}`] as TerrainType;
    const adj2 = tile[`terrainType${directionShort[adjacentDirections[tile.direction][1]]}`] as TerrainType;
    const {
      group, coord, colorsTerrainMap, colorsTerrainMapAdj,
    } = getAutogenSettings(tile.terrainType, tile.terrainTypeCenter, adj1, adj2, tile.direction);
    // console.log(tile.tileID, group, colorsTerrainMap, colorsTerrainMapAdj);
    if (group === undefined) {
      return;
    }
    outTileset.blit(autogenTemplate, tx, ty, coord.x, coord.y, tileWidth, tileHeight);
    const colorGroupTerrain = {
      [AutogenColorGroup.PRIMARY]: [colorsTerrainMap[AutogenColorGroup.PRIMARY], colorsTerrainMapAdj[AutogenColorGroup.PRIMARY]],
      [AutogenColorGroup.CENTER]: [colorsTerrainMap[AutogenColorGroup.CENTER], colorsTerrainMapAdj[AutogenColorGroup.CENTER]],
      [AutogenColorGroup.SECONDARY]: [colorsTerrainMap[AutogenColorGroup.SECONDARY], colorsTerrainMapAdj[AutogenColorGroup.SECONDARY]],
      [AutogenColorGroup.CENTER_SECONDARY]: [colorsTerrainMap[AutogenColorGroup.CENTER_SECONDARY], colorsTerrainMapAdj[AutogenColorGroup.CENTER_SECONDARY]],
    }
    // console.log(colorGroupTerrain);
    outTileset.scan(tx, ty, tileWidth, tileHeight, (x, y) => {
      const color = outTileset.getPixelColor(x, y);

      // replace the first 3 colors
      for (const colorGroup of autogenColorGroups) {
        const matchingTerrainTypes = colorGroupTerrain[colorGroup];
        autogenColors[colorGroup].slice(0, 3).forEach((matchColor, index) => {
          if (color === matchColor) {
            const newColorSet = autogenTerrainColors[matchingTerrainTypes[0]][matchingTerrainTypes[1] || matchingTerrainTypes[0]];
            if (newColorSet) {
              outTileset.setPixelColor(newColorSet[index], x, y);
            } else {
              console.log(`Missing transition colors for ${terrainTypeTitles[matchingTerrainTypes[0]]} -> ${terrainTypeTitles[matchingTerrainTypes[1]]}`);
            }
            return;
          }
        });
      }
    });

    // put objects where last two colors are
    for (const colorGroup of autogenColorGroups) {
      const matchingTerrainTypes = colorGroupTerrain[colorGroup];
      autogenColors[colorGroup].slice(3).forEach((matchColor, index) => {
        outTileset.scan(tx, ty, tileWidth, tileHeight, (x, y) => {
          const color = outTileset.getPixelColor(x, y);
          if (color === matchColor) {
            const newColorSet = autogenTerrainColors[matchingTerrainTypes[0]][matchingTerrainTypes[1] || matchingTerrainTypes[0]];
            // place object here
            const object = getRandomObject(matchingTerrainTypes[0]);
            if (object) {
              outTileset.blit(autogenObjectsTileset, x - 7, y - 14, object.x, object.y, 15, 15);
            } else {
              outTileset.setPixelColor(newColorSet[index], x, y);
            }
          }
        });
      });
    }

  });

  const outTemplatePath = path.resolve(path.join(argv.outputPath, `${argv.tilesetDefName}.png`));
  const outTilesetPath = path.resolve(path.join(argv.outputPath, `${argv.tilesetDefName}-autogen.png`));
  outTemplate.writeAsync(outTemplatePath);
  outTileset.writeAsync(outTilesetPath);
}

async function buildTilesetDef(template: Jimp, autogenTemplate: Jimp) {
  const tilesXML = [];
  const tiles: SectionalTile[] = [];

  let tileID = 0;

  const addTileType = (
    terrainTypeCenter: TerrainType,
    terrainType: TerrainType,
    neighbors: TerrainType[],
    shouldAddTile: (adj1: TerrainType, adj2: TerrainType) => boolean = () => true,
  ) => {
    console.log(`Building tile type ${terrainTypeTitles[terrainTypeCenter]} (center) <--> ${terrainTypeTitles[terrainType]} (edge)\t[${neighbors.map(terrainType => terrainTypeTitles[terrainType]).join(', ')}]`)
    for (const adj1 of neighbors) {
      for (const adj2 of neighbors) {
        if (!shouldAddTile(adj1, adj2)) continue;
        indexOrder.forEach(direction => {
          const adj1Terrain = `terrainType${directionShort[adjacentDirections[direction][0]]}`;
          const adj2Terrain = `terrainType${directionShort[adjacentDirections[direction][1]]}`;
          const properties = [
            {
              $: {
                name: 'direction',
                value: directionShort[direction],
                type: 'str',
              }
            },
            {
              $: {
                name: 'terrainType',
                value: terrainType,
                type: 'int',
              }
            },
            {
              $: {
                name: 'terrainTypeCenter',
                value: terrainTypeCenter,
                type: 'int',
              }
            },
            {
              $: {
                name: adj1Terrain,
                value: adj1,
                type: 'int',
              },
            },
            {
              $: {
                name: adj2Terrain,
                value: adj2,
                type: 'int',
              },
            }
          ];
          tiles.push({
            tileID,
            direction,
            terrainType: (terrainType as unknown) as TerrainType,
            terrainTypeCenter,
            [adj1Terrain]: adj1,
            [adj2Terrain]: adj2,
          })

          tilesXML.push({
            $: {
              id: tileID,
            },
            properties: {
              property: properties, 
            }
          })
          tileID++;
        });
      }
    }
  }

  // add base tiles
  console.log('Adding base tiles');
  for (let t = 1; t <= terrainTypeMax; t++) {
    addTileType(t, t, [t]);
  }

  // add transition tiles
  console.log('Adding transition base tiles');
  for (const [terrainTypeCenter_, edgeTerrainTypes] of Object.entries(terrainTransitions)) {
    for (const edgeTerrainType of edgeTerrainTypes) {
      const terrainTypeCenter = parseInt(terrainTypeCenter_, 10) as unknown as TerrainType;
      addTileType(
        terrainTypeCenter,
        edgeTerrainType,
        [edgeTerrainType, ...(terrainBackTransitions[edgeTerrainType] || [])],
      );
    }
  }

  console.log('Adding transition edge tiles');
  for (const [terrainTypeCenter_, edgeTerrainTypes] of Object.entries(terrainTransitions)) {
    const terrainTypeCenter = parseInt(terrainTypeCenter_, 10) as unknown as TerrainType;
    addTileType(
      terrainTypeCenter,
      terrainTypeCenter,
      edgeTerrainTypes,
      (adj1, adj2) => !(adj1 === terrainTypeCenter && adj2 === terrainTypeCenter)
    );
  }

  const tilesWidth = 12;
  const tilesHeight = Math.ceil(tileID / tilesWidth);
  console.log(`Building template with ${tiles.length} sectional tiles`);

  const image = await buildTemplateTileset(template, autogenTemplate, tiles, tilesWidth, tilesHeight);
  
  const xml = xmlBuilder.buildObject({
    tileset: {
      $: {
        version: '1.2',
        tiledversion: '1.3.4',
        name: argv.tilesetDefName,
        tilewidth: 32,
        tileheight: 48,
        tilecount: tilesXML.length,
        columns: tilesWidth,
      },
      tileoffset: {
        $: {
          x: 0,
          y: 2,
        }
      },
      image: {
        $: {
          source: `${argv.tilesetDefName}-template.png`,
          width: tilesWidth * tileWidth,
          height: tilesHeight * tileHeight,
        },
      },
      tile: tilesXML,
    }
  });

  const outputFilePath = path.resolve(path.join(argv.outputPath, argv.tilesetDefName + '.' + argv.outputExtension));
  console.log('Outputing', outputFilePath);
  fs.writeFileSync(outputFilePath, xml);
}

async function main() {
  const template = await Jimp.read(getFilePath('src', 'assets', 'template.png'));
  const autogenTemplate = await Jimp.read(getFilePath('src', 'assets', 'autogen-template-2.png'));
  try {
    await buildTilesetDef(template, autogenTemplate);
  } catch (err) {
    console.error(err);
    process.exit(0);
  }
}

main();
