#!/usr/bin/env ts-node-script

import path from 'path';
import fs from 'fs';
import { Builder } from 'xml2js';
import yargs, { number } from 'yargs';
import { TerrainType, terrainTypeMax, directionShort, Direction, terrainColors, terrainMinimapColors } from '../src/mapviewer/constants';
import { renderOrder, adjacentDirections, newImage, SectionalTile, getFilePath, indexOrder } from './shared';
import Jimp from 'jimp';


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

enum TemplateColor {
  TERRAIN_TYPE = Jimp.rgbaToInt(255, 0, 0, 255),
  TERRAIN_TYPE_CENTER = Jimp.rgbaToInt(0, 255, 0, 255),
  TERRAIN_TYPE_ADJ_1 = Jimp.rgbaToInt(255, 0, 255, 255),
  TERRAIN_TYPE_ADJ_2 = Jimp.rgbaToInt(255, 255, 0, 255),
}

async function buildTemplateTileset(template: Jimp, tiles: SectionalTile[], columns: number, rows: number) {
  const image = await newImage(columns * tileWidth, rows * tileHeight);
  tiles.forEach((tile, index) => {
    const templateTile = templateDirectionCoords[tile.direction]
    const tx = (index % columns) * tileWidth;
    const ty = (Math.floor(index / columns)) * tileHeight;
    image.blit(template, tx, ty, templateTile.x, templateTile.y, tileWidth, tileHeight);
    image.scan(tx, ty, tileWidth, tileHeight, (x, y) => {
      const color = image.getPixelColor(x, y);
      if (color === TemplateColor.TERRAIN_TYPE) {
        const newColor = terrainMinimapColors[tile.terrainType];
        image.setPixelColor(Jimp.cssColorToHex(newColor), x, y);
      } else if (color === TemplateColor.TERRAIN_TYPE_CENTER) {
        const newColor = terrainMinimapColors[tile.terrainTypeCenter];
        image.setPixelColor(Jimp.cssColorToHex(newColor), x, y);
      } else if (color === TemplateColor.TERRAIN_TYPE_ADJ_1) {
        const adj_1 = adjacentDirections[tile.direction][0];
        const newColor = terrainMinimapColors[tile[`terrainType${directionShort[adj_1]}`]];
        image.setPixelColor(Jimp.cssColorToHex(newColor), x, y);
      } else if (color === TemplateColor.TERRAIN_TYPE_ADJ_2) {
        const adj_2 = adjacentDirections[tile.direction][1];
        const newColor = terrainMinimapColors[tile[`terrainType${directionShort[adj_2]}`]];
        image.setPixelColor(Jimp.cssColorToHex(newColor), x, y);
      }
    })
  });
  return image;
}

async function buildTilesetDef(template: Jimp) {
  const tilesXML = [];
  const tiles: SectionalTile[] = [];

  let tileID = 0;
  for (let terrainType = 1; terrainType <= terrainTypeMax; terrainType++) {
    for (let terrainTypeCenter = 1; terrainTypeCenter <= terrainTypeMax; terrainTypeCenter++) {
      for (let adj1 = 1; adj1 <= terrainTypeMax; adj1++) {
        for (let adj2 = 1; adj2 <= terrainTypeMax; adj2++) {
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
              terrainType,
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
  console.log('tiles', tiles);

  const tilesWidth = 12;
  const tilesHeight = Math.ceil(tileID / tilesWidth);
  console.log('building tiles:', tileID, tilesWidth, tilesHeight);

  const image = await buildTemplateTileset(template, tiles, tilesWidth, tilesHeight);


  const imageName = argv.tilesetDefName + '.png';
  const outputImagePath = path.resolve(path.join(argv.outputPath, imageName));
  image.writeAsync(outputImagePath);
  
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
          source: imageName,
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
  try {
    await buildTilesetDef(template);
  } catch (err) {
    console.error(err);
    process.exit(0);
  }
}

main();
