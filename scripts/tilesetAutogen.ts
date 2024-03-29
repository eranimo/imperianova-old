#!/usr/bin/env ts-node-script

import path from 'path';
import fs from 'fs';
import { parseStringPromise, Builder } from 'xml2js';
import yargs from 'yargs';
import {
  TerrainType,
  terrainTypeMax,
  directionShort,
  Direction,
  indexOrder,
  terrainMinimapColors,
  terrainTransitions,
  terrainTypeTitles,
  terrainBackTransitions,
  adjacentDirections,
  SectionalTile,
  riverTransitions,
} from '../src/mapviewer/constants';
import { newImage, getFilePath, propertyTypeProcess } from './shared';
import Jimp from 'jimp';
import { union, random } from 'lodash';
import { MultiDictionary } from 'typescript-collections';
import { getAutogenSettings, AutogenColorGroup, autogenColorGroups, autogenColors, autogenTerrainColors, autogenObjectsChance, autogenVariations, getAutogenGroup } from './autogenSettings';

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
  padding: {
    typer: 'number',
    description: 'Padding in tileset image',
    alias: 'p',
    default: 15,
  },
}).argv;

enum AutogenTemplate {
  MAIN,
  RIVER,
  RIVER_MOUTH,
};

type AutogenTemplateImages = Record<AutogenTemplate, Jimp>;

const autogenTemplatePaths = {
  [AutogenTemplate.MAIN]: getFilePath('src', 'assets', 'autogen-template-2.png'),
  [AutogenTemplate.RIVER]: getFilePath('src', 'assets', 'autogen-template-river.png'),
  [AutogenTemplate.RIVER_MOUTH]: getFilePath('src', 'assets', 'autogen-template-rivermouth.png'),
}

// template for terrainType (edge)
const terrainTemplates: Partial<Record<TerrainType, AutogenTemplate[]>> = {
  [TerrainType.RIVER]: [AutogenTemplate.RIVER],
  [TerrainType.OCEAN]: [AutogenTemplate.MAIN],
  [TerrainType.GRASSLAND]: [AutogenTemplate.MAIN],
  [TerrainType.FOREST]: [AutogenTemplate.MAIN],
  [TerrainType.DESERT]: [AutogenTemplate.MAIN],
  [TerrainType.TAIGA]: [AutogenTemplate.MAIN],
  [TerrainType.TUNDRA]: [AutogenTemplate.MAIN],
  [TerrainType.GLACIAL]: [AutogenTemplate.MAIN],
}

const xmlBuilder = new Builder();

export const tileWidth = 32;
const tileHeight = 48;

export const templateDirectionCoords: Record<Direction, { x: number, y: number}> = {
  [Direction.N]: { x: 0, y: 0 },
  [Direction.NE]: { x: 1 * tileWidth, y: 0 },
  [Direction.SE]: { x: 2 * tileWidth, y: 0 },
  [Direction.S]: { x: 0, y: 1 * tileHeight },
  [Direction.SW]: { x: 1 * tileWidth, y: 1 * tileHeight },
  [Direction.NW]: { x: 2 * tileWidth, y: 1 * tileHeight },
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
  debugTemplate: Jimp,
  templates: AutogenTemplateImages,
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
  const outTemplate = await newImage(columns * (tileWidth + argv.padding), rows * (tileHeight + argv.padding));
  const outTileset = await newImage(columns * (tileWidth + argv.padding), rows * (tileHeight + argv.padding));
  let tilesByGroup = new MultiDictionary<number, SectionalTile>();
  console.log(`Drawing ${tiles.length} tiles`);
  tiles.forEach((tile, index) => {
    const templateTile = templateDirectionCoords[tile.direction]
    const tx = (index % columns) * (tileWidth + argv.padding);
    const ty = (Math.floor(index / columns)) * (tileHeight + argv.padding);
    outTemplate.blit(debugTemplate, tx, ty, templateTile.x, templateTile.y, tileWidth, tileHeight);
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
    } = getAutogenSettings(tile.terrainType, tile.terrainTypeCenter, adj1, adj2, tile.direction, templateDirectionCoords, tileWidth);
    // console.log(tile.tileID, group, colorsTerrainMap, colorsTerrainMapAdj);
    if (group === undefined) {
      console.log(`Skipping terrainType: ${terrainTypeTitles[tile.terrainType]}, terrainTypeCenter: ${terrainTypeTitles[tile.terrainTypeCenter]}, adj1: ${terrainTypeTitles[adj1]}, adj2: ${terrainTypeTitles[adj2]}`);
      return;
    };
    const colorGroupTerrain = {
      [AutogenColorGroup.PRIMARY]: [colorsTerrainMap[AutogenColorGroup.PRIMARY], colorsTerrainMapAdj[AutogenColorGroup.PRIMARY]],
      [AutogenColorGroup.CENTER]: [colorsTerrainMap[AutogenColorGroup.CENTER], colorsTerrainMapAdj[AutogenColorGroup.CENTER]],
      [AutogenColorGroup.SECONDARY]: [colorsTerrainMap[AutogenColorGroup.SECONDARY], colorsTerrainMapAdj[AutogenColorGroup.SECONDARY]],
      [AutogenColorGroup.CENTER_SECONDARY]: [colorsTerrainMap[AutogenColorGroup.CENTER_SECONDARY], colorsTerrainMapAdj[AutogenColorGroup.CENTER_SECONDARY]],
      [AutogenColorGroup.TERTIARY]: [colorsTerrainMap[AutogenColorGroup.TERTIARY], colorsTerrainMapAdj[AutogenColorGroup.TERTIARY]],
      [AutogenColorGroup.CENTER_TERTIARY]: [colorsTerrainMap[AutogenColorGroup.CENTER_TERTIARY], colorsTerrainMapAdj[AutogenColorGroup.CENTER_TERTIARY]],
    }
    tilesByGroup.setValue(group, tile);
    if (!(tile.terrainTypeCenter in terrainTemplates)) {
      throw new Error(`${tile.terrainTypeCenter} does not have an assigned tileset template`);
    }
    let tilesetTemplate = AutogenTemplate.MAIN;
    // terrainTemplates[colorGroupTerrain[AutogenColorGroup.PRIMARY][0]];
    if (
      tile.terrainType === TerrainType.RIVER ||
      (tile.terrainTypeCenter !== TerrainType.OCEAN && (adj1 === TerrainType.RIVER || adj2 === TerrainType.RIVER))
    ) {
      tilesetTemplate = AutogenTemplate.RIVER;
    } else if (tile.terrainTypeCenter === TerrainType.OCEAN && (adj1 === TerrainType.RIVER || adj2 === TerrainType.RIVER)) {
      tilesetTemplate = AutogenTemplate.RIVER_MOUTH;
    }

    const pickedTemplate = templates[tilesetTemplate];
    outTileset.blit(pickedTemplate, tx, ty, coord.x, coord.y, tileWidth, tileHeight);
    // console.log(colorGroupTerrain);
    outTileset.scan(tx, ty, tileWidth, tileHeight, (x, y) => {
      const color = outTileset.getPixelColor(x, y);

      // replace the first 3 colors
      for (const colorGroup of autogenColorGroups) {
        const matchingTerrainTypes = colorGroupTerrain[colorGroup];
        autogenColors[colorGroup].slice(0, 3).forEach((matchColor, index) => {
          if (color === matchColor) {
            let newColorSet: number[];
            try {
              newColorSet = autogenTerrainColors[matchingTerrainTypes[0]][matchingTerrainTypes[1] || matchingTerrainTypes[0]];
            } catch (err) {
              console.error('colorGroupTerrain', colorGroupTerrain);
              console.error('colorGroup', colorGroup);
              throw new Error(`Cannot find color to replace`);
            }
            if (newColorSet) {
              outTileset.setPixelColor(newColorSet[index], x, y);
            } else {
              throw new Error(`Missing transition colors for ${terrainTypeTitles[matchingTerrainTypes[0]]} -> ${terrainTypeTitles[matchingTerrainTypes[1]]} in group ${group} - terrainType: ${terrainTypeTitles[tile.terrainType]}\t terrainTypeCenter: ${terrainTypeTitles[tile.terrainTypeCenter]}\t adj1: ${terrainTypeTitles[adj1]} \t adj2: ${terrainTypeTitles[adj2]}`);
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
            const shouldPlace = Math.random() < (autogenObjectsChance[matchingTerrainTypes[0]] || 1);
            if (object && shouldPlace) {
              outTileset.blit(autogenObjectsTileset, x - 7, y - 14, object.x, object.y, 15, 15);
            } else {
              // console.log(`Missing objects for ${terrainTypeTitles[matchingTerrainTypes[0]]} - ${terrainTypeTitles[matchingTerrainTypes[1] || matchingTerrainTypes[0]]}`)
              outTileset.setPixelColor(newColorSet[0], x, y);
            }
          }
        });
      });
    }
  });

  console.log('Tiles per group');
  for (const groupID of tilesByGroup.keys()) {
    console.log(` - Group #${groupID}: ${tilesByGroup.getValue(groupID).length} tiles`);
  }

  const outTemplatePath = path.resolve(path.join(argv.outputPath, `${argv.tilesetDefName}-template.sectional.png`));
  const outTilesetPath = path.resolve(path.join(argv.outputPath, `${argv.tilesetDefName}.sectional.png`));
  outTemplate.writeAsync(outTemplatePath);
  outTileset.writeAsync(outTilesetPath);
}

async function buildTilesetDef(template: Jimp, templates: AutogenTemplateImages) {
  const tilesXML = [];
  const tiles: SectionalTile[] = [];

  let tileID = 0;
  
  let tileCache = new Map();

  const addTileType = (
    terrainTypeCenter: TerrainType,
    terrainType: TerrainType,
    neighbors: TerrainType[],
    shouldAddTile: (adj1: TerrainType, adj2: TerrainType) => boolean = () => true,
  ) => {
    const count = neighbors.length * neighbors.length;
    console.log(`\tBuilding ${count} tiles: ${terrainTypeTitles[terrainTypeCenter]} (center) <--> ${terrainTypeTitles[terrainType]} (edge)\t\t[${neighbors.map(terrainType => terrainTypeTitles[terrainType]).join(', ')}]`)
    for (const adj1 of neighbors) {
      for (const adj2 of neighbors) {
        if (!shouldAddTile(adj1, adj2)) {
          // console.log(`\t\tHIDING ${terrainTypeTitles[adj1]} - ${terrainTypeTitles[adj2]}`)
          continue;
        }

        let group = getAutogenGroup(terrainType, terrainTypeCenter, adj1, adj2);
        let variations = 1;
        if (
          terrainTypeCenter in autogenVariations &&
          group in autogenVariations[terrainTypeCenter]
        ) {
          variations = autogenVariations[terrainTypeCenter][group];
          console.log(`(group: ${group}) Building ${variations} variations of`, terrainTypeCenter, terrainType, adj1, adj2);
        }
        for (let variantID = 0; variantID < variations; variantID++) {
          const cacheKey = `${terrainTypeCenter},${terrainType},${adj1},${adj2},${variantID}`;
          if (tileCache.has(cacheKey)) continue;
          tileCache.set(cacheKey, true);

          // console.log(`\t\t(${cacheKey}) ${terrainTypeTitles[adj1]} - ${terrainTypeTitles[adj2]}`)
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
  }

  console.log('Adding Group 0');
  for (let t = 1; t <= terrainTypeMax; t++) {
    addTileType(t, t, [t]);
  }

  console.log('\nAdding Group 1, 2');
  for (const [terrainTypeCenter_, edgeTerrainTypes] of Object.entries(terrainTransitions)) {
    const terrainTypeCenter = parseInt(terrainTypeCenter_, 10) as unknown as TerrainType;
    for (const edgeTerrainType of edgeTerrainTypes) {
      addTileType(
        terrainTypeCenter,
        edgeTerrainType,
        [edgeTerrainType, terrainTypeCenter],
      );
    }
  }

  console.log('\nAdding Group 5, 6, 7');
  for (const [terrainTypeCenter_, edgeTerrainTypes] of Object.entries(terrainTransitions)) {
    const terrainTypeCenter = parseInt(terrainTypeCenter_, 10) as unknown as TerrainType;
    for (const edgeTerrainType of edgeTerrainTypes) {
      addTileType(
        terrainTypeCenter,
        terrainTypeCenter,
        [terrainTypeCenter, edgeTerrainType],
        (adj1, adj2) => !(terrainTypeCenter === adj1 && terrainTypeCenter === adj2)
      );
    }
  }

  console.log('\nAdding Group 8');
  for (const [terrainTypeCenter_, edgeTerrainTypes] of Object.entries(terrainTransitions)) {
    const terrainTypeCenter = parseInt(terrainTypeCenter_, 10) as unknown as TerrainType;
    addTileType(
      terrainTypeCenter,
      terrainTypeCenter,
      edgeTerrainTypes,
      (adj1, adj2) => adj1 !== adj2
    );
  }

  console.log('\nAdding Group 9');
  for (const [terrainTypeCenter_, edgeTerrainTypes] of Object.entries(terrainTransitions)) {
    const terrainTypeCenter = parseInt(terrainTypeCenter_, 10) as unknown as TerrainType;
    for (const edgeTerrainType of edgeTerrainTypes) {
      addTileType(
        terrainTypeCenter,
        edgeTerrainType,
        [
          ...edgeTerrainTypes,
          // ...(terrainBackTransitions[edgeTerrainType] || [])
        ],
        (adj1, adj2) => (
          adj1 !== terrainTypeCenter &&
          adj1 !== edgeTerrainType &&
          adj2 !== terrainTypeCenter &&
          adj2 !== edgeTerrainType &&
          adj1 === adj2
        )
      );
    }
  }

  console.log('\nAdding Group 3, 4, 10, 11');
  for (const [terrainTypeCenter_, edgeTerrainTypes] of Object.entries(terrainTransitions)) {
    const terrainTypeCenter = parseInt(terrainTypeCenter_, 10) as unknown as TerrainType;
    for (const edgeTerrainType of edgeTerrainTypes) {
      addTileType(
        terrainTypeCenter,
        edgeTerrainType,
        edgeTerrainTypes,
        (adj1, adj2) => (
          adj1 !== adj2 &&
          (adj1 === edgeTerrainType || adj2 === edgeTerrainType)
        )
      );
    }
  }

  console.log('\nAdding Group 12, 13');
  for (const [terrainTypeCenter_, edgeTerrainTypes] of Object.entries(terrainTransitions)) {
    const terrainTypeCenter = parseInt(terrainTypeCenter_, 10) as unknown as TerrainType;
    for (const edgeTerrainType of edgeTerrainTypes) {
      addTileType(
        terrainTypeCenter,
        edgeTerrainType,
        [terrainTypeCenter, ...edgeTerrainTypes.filter(i => i !== edgeTerrainType)],
        (adj1, adj2) => (
          (
            adj1 === terrainTypeCenter ||
            adj2 === terrainTypeCenter
          ) && (
            adj1 !== adj2
          )
        )
      );
    }
  }

  console.log('\nAdding Group 14');
  for (const [terrainTypeCenter_, edgeTerrainTypes] of Object.entries(terrainTransitions)) {
    const terrainTypeCenter = parseInt(terrainTypeCenter_, 10) as unknown as TerrainType;
    for (const edgeTerrainType of edgeTerrainTypes) {
      addTileType(
        terrainTypeCenter,
        edgeTerrainType,
        union([
          ...edgeTerrainTypes.filter(i => (
            terrainTransitions[edgeTerrainType]
              ? terrainTransitions[edgeTerrainType].includes(i)
              : true
          )),
          ...(terrainBackTransitions[edgeTerrainType] || []),
          // ...(terrainBackTransitions[terrainTypeCenter] || [])
        ]),
        (adj1, adj2) => (
          adj1 !== adj2 &&
          adj1 !== terrainTypeCenter &&
          adj1 !== edgeTerrainType &&
          adj2 !== terrainTypeCenter &&
          adj2 !== edgeTerrainType
        )
      );
    }
  }
  console.log('\nAdding river edges');
  for (const riverTransitionType of riverTransitions) {
    addTileType(
      TerrainType.RIVER,
      riverTransitionType,
      [riverTransitionType, TerrainType.RIVER, ...(terrainTransitions[riverTransitionType] || [])],
    );
    addTileType(
      riverTransitionType,
      riverTransitionType,
      [riverTransitionType, TerrainType.RIVER, ...(terrainTransitions[riverTransitionType] || [])],
    );
    addTileType(
      riverTransitionType,
      TerrainType.RIVER,
      [riverTransitionType, TerrainType.RIVER, ...(terrainTransitions[riverTransitionType] || [])],
    );
    if (terrainTransitions[riverTransitionType]) {
      for (const edgeTerrainType of terrainTransitions[riverTransitionType]) {
        addTileType(
          riverTransitionType,
          edgeTerrainType,
          [TerrainType.RIVER, riverTransitionType, ...(terrainTransitions[riverTransitionType] || [])],
        );
      }
    }
  }

  console.log('\nAdding river mouths');
  for (const edgeTerrainType of terrainTransitions[TerrainType.OCEAN]) {
    addTileType(
      TerrainType.OCEAN,
      edgeTerrainType,
      union([
        TerrainType.RIVER,
        edgeTerrainType,
        ...(terrainTransitions[edgeTerrainType] || []),
        ...(terrainBackTransitions[edgeTerrainType] || []),
      ]),
    );
  }



  const tilesWidth = 24;
  const tilesHeight = Math.ceil(tileID / tilesWidth);
  console.log(`\nBuilding template with ${tiles.length} sectional tiles`);

  const image = await buildTemplateTileset(template, templates, tiles, tilesWidth, tilesHeight);
  
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
        spacing: argv.padding,
      },
      tileoffset: {
        $: {
          x: 0,
          y: 2,
        }
      },
      image: {
        $: {
          source: `${argv.tilesetDefName}.sectional.png`,
          width: tilesWidth * (tileWidth + argv.padding),
          height: tilesHeight * (tileHeight + argv.padding),
        },
      },
      tile: tilesXML,
    }
  });

  const outputFilePath = path.resolve(path.join(argv.outputPath, argv.tilesetDefName + '.sectional.' + argv.outputExtension));
  console.log('Outputing', outputFilePath);
  fs.writeFileSync(outputFilePath, xml);
}

async function main() {
  const template = await Jimp.read(getFilePath('src', 'assets', 'template.png'));
  const autogenTemplates: AutogenTemplateImages = {
    [AutogenTemplate.MAIN]: await Jimp.read(autogenTemplatePaths[AutogenTemplate.MAIN]),
    [AutogenTemplate.RIVER]: await Jimp.read(autogenTemplatePaths[AutogenTemplate.RIVER]),
    [AutogenTemplate.RIVER_MOUTH]: await Jimp.read(autogenTemplatePaths[AutogenTemplate.RIVER_MOUTH]),
  };

  try {
    await buildTilesetDef(template, autogenTemplates);
  } catch (err) {
    console.error(err);
    process.exit(0);
  }
}

main();
