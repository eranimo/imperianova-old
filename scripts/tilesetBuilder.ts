#!/usr/bin/env ts-node-script

import fs from 'fs';
import Jimp from 'jimp';
import { parseStringPromise, parseString } from 'xml2js';
import ndarray from 'ndarray';
import { getTilesetMask } from '../src/mapviewer/utils';
import { TerrainType, Direction, directionShort, terrainTypeMax, terrainTypes, terrainTypeTitles, terrainTransitions, terrainBackTransitions } from '../src/mapviewer/constants';
import { sum } from 'lodash';
import yargs from 'yargs';
import { SectionalTile, TileVariant, renderOrder, adjacentDirections, newImage, getFilePath, propertyTypeProcess } from './shared';


yargs.command('* <tilesetName>', 'Builds tilesets from Tiled definition');
const argv = yargs.options({
  tilesetDefPath: {
    type: 'string',
    description: 'Path to the tileset .tsx/.xml Tiled tileset file',
    alias: 'd',
    demandOption: true,
  },
  tilesetImagePath: {
    type: 'string',
    description: 'Path to tileset image',
    alias: 'i',
    demandOption: true,
  },
  outputPath: {
    type: 'string',
    description: 'Output folder for tileset',
    alias: 'o',
    default: './',
  },
  columns: {
    type: 'number',
    description: 'Number of columns in tileset',
    alias: 'c',
    default: 25,
  },
  padding: {
    typer: 'number',
    description: 'Padding in tileset image',
    alias: 'p',
    default: 15,
  },
}).argv;

const tiles: SectionalTile[] = [];
const tilesByID: Map<number, SectionalTile> = new Map();
const tilesByDirection: Map<Direction, SectionalTile[]> = new Map();
const images: Map<number, Uint32Array> = new Map();

let imagePNG: Jimp;

let columns: number;
let tileWidth: number;
let tileHeight: number;

async function loadFiles() {
  const xmlFilePath = getFilePath(argv.tilesetDefPath);
  const pngFilePath = getFilePath(argv.tilesetImagePath);
  console.log(`Processing ${pngFilePath}`);

  const xmlFileRaw = fs.readFileSync(xmlFilePath, { encoding: 'utf-8' });
  const xmlFile = await parseStringPromise(xmlFileRaw);

  columns = parseInt(xmlFile.tileset.$.columns, 10);
  tileWidth = parseInt(xmlFile.tileset.$.tilewidth, 10);
  tileHeight = parseInt(xmlFile.tileset.$.tileheight, 10);

  // load xml
  for (const rawTile of xmlFile.tileset.tile) {
    let tile: any = {
      tileID: parseInt(rawTile.$.id, 10),
    };
    rawTile.properties.forEach(i => i.property.forEach(({ $ }) => {
      tile[$.name] = propertyTypeProcess[$.type || 'str']($.value);
    }));
    if (tile.direction) {
      const direction = parseInt(Direction[tile.direction], 10) as Direction;
      tile.direction = direction;
      tiles.push(tile);
      tilesByID.set(tile.id, tile);
      if (tilesByDirection.has(direction)) {
        tilesByDirection.get(direction).push(tile);
      } else {
        tilesByDirection.set(direction, [tile]);
      }
    }
  }
  console.log('Loaded all files');
  for (const [direction, tiles] of tilesByDirection) {
    console.log(`Found ${tiles.length} ${directionShort[direction]} tiles`);
  }

  // load image
  imagePNG = await Jimp.read(pngFilePath);
}

const formatDirectionTerrain = (
  value: Record<Direction, TerrainType>,
  options: Partial<Record<Direction, any[]>>
) => {
  const out = [];
  for (const [direction, terrainType] of Object.entries(value)) {
    out.push(`${directionShort[direction]}:\t`, `${terrainTypeTitles[terrainType]} (${options[direction].length})`.padEnd(15));
  }
  return out.join(' ');
}

function getVariantID(sideTileIDs: Record<Direction, number>): string {
  return [
    sideTileIDs[Direction.SE],
    sideTileIDs[Direction.NE],
    sideTileIDs[Direction.N],
    sideTileIDs[Direction.NW],
    sideTileIDs[Direction.SW],
    sideTileIDs[Direction.S]
  ].join(',');
}

function createTilesetVariants(
  terrainTypeCenter: TerrainType,
  directionTerrain: Record<Direction, TerrainType>
): TileVariant[] {
  // a list of all possible tiles for each variant that are possible for this combination of terrainTypes
  const directionTileOptions: Partial<Record<Direction, SectionalTile[]>> = {};
  
  renderOrder.forEach(direction => {
    const directionTiles = tilesByDirection.get(direction);
    const adjDirection1 = adjacentDirections[direction][0] as Direction;
    const adjDirection2 = adjacentDirections[direction][1] as Direction;
    const terrain1 = directionTerrain[adjDirection1];
    const terrain2 = directionTerrain[adjDirection2];

    const matchingTiles = directionTiles.filter(tile => (
      tile.terrainTypeCenter === terrainTypeCenter &&
      tile.terrainType === directionTerrain[direction] &&
      tile[`terrainType${directionShort[adjDirection1]}`] === terrain1 &&
      tile[`terrainType${directionShort[adjDirection2]}`] === terrain2
    ));
    directionTileOptions[direction] = matchingTiles;
  });

  // all possible combination of tiles
  const sectionCombinations: TileVariant[] = [];
  for (let se_count = 0; se_count < directionTileOptions[Direction.SE].length; se_count++) {
    const se_tile = directionTileOptions[Direction.SE][se_count];
    for (let ne_count = 0; ne_count < directionTileOptions[Direction.NE].length; ne_count++) {
      const ne_tile = directionTileOptions[Direction.NE][ne_count];
      for (let n_count = 0; n_count < directionTileOptions[Direction.N].length; n_count++) {
        const n__tile = directionTileOptions[Direction.N][n_count];
        for (let nw_count = 0; nw_count < directionTileOptions[Direction.NW].length; nw_count++) {
          const nw_tile = directionTileOptions[Direction.NW][nw_count];
          for (let sw_count = 0; sw_count < directionTileOptions[Direction.SW].length; sw_count++) {
            const sw_tile = directionTileOptions[Direction.SW][sw_count];
            for (let s_count = 0; s_count < directionTileOptions[Direction.S].length; s_count++) {
              const s__tile = directionTileOptions[Direction.S][s_count];
              const neighborTerrain = {
                [Direction.SE]: se_tile.terrainType,
                [Direction.NE]: ne_tile.terrainType,
                [Direction.N]: n__tile.terrainType,
                [Direction.NW]: nw_tile.terrainType,
                [Direction.SW]: sw_tile.terrainType,
                [Direction.S]: s__tile.terrainType,
              };
              const sideTileIDs = {
                [Direction.SE]: se_tile.tileID,
                [Direction.NE]: ne_tile.tileID,
                [Direction.N]: n__tile.tileID,
                [Direction.NW]: nw_tile.tileID,
                [Direction.SW]: sw_tile.tileID,
                [Direction.S]: s__tile.tileID,
              };
              sectionCombinations.push({
                terrainTypeCenter,
                neighborTerrainTypes: neighborTerrain,
                variantID: getVariantID(sideTileIDs),
                mask: getTilesetMask(
                  terrainTypeCenter,
                  neighborTerrain,
                ),
                sideTileIDs
              });
            }
          }
        }
      }
    }
  }
  // if (sectionCombinations.length > 0) {
  //   console.log(`\t\t\tWith center ${terrainTypeTitles[terrainTypeCenter]}:`, formatDirectionTerrain(directionTerrain, directionTileOptions));
  //   console.log(`\t\t\t\tCombinations: ${sectionCombinations.length}`)
  // }
  return sectionCombinations;
}

async function createTilesetImage(
  tileVariants: TileVariant[],
  columnCount: number,
  filepath: string,
) {
  const count = tileVariants.length;
  const tilesetWidth = columnCount * (tileWidth + argv.padding);
  const tilesetHeight = Math.ceil(count / columnCount) * (tileHeight + argv.padding);
  console.log(`Creating tileset image with ${tileVariants.length} tiles (image size: ${tilesetWidth}x${tilesetHeight})`);
  const image = await newImage(tilesetWidth, tilesetHeight);
  tileVariants.forEach((tileVariant, index) => {
    const tx = (index % columnCount) * (tileWidth + argv.padding);
    const ty = (Math.floor(index / columnCount)) * (tileHeight + argv.padding);
    renderOrder.forEach(direction => {
      const tileID = tileVariant.sideTileIDs[direction];
      const x = (tileID % columns) * (tileWidth + argv.padding);
      const y = (Math.floor(tileID / columns)) * (tileHeight + argv.padding);

      image.blit(imagePNG, tx, ty, x, y, tileWidth, tileHeight);
    });
  });
  return image.writeAsync(filepath);
}

const formatTerrainTypeList = (values: TerrainType[]) => values.map(t => terrainTypeTitles[t]).join(', ')

function getVariantsForTerrainType(terrainType: TerrainType) {
  const variants: TileVariant[] = [];
  const neighbors = [terrainType, ...(terrainTransitions[terrainType] || [])];
  console.log(`Building variants for ${terrainTypeTitles[terrainType]}`);
  console.log('\tNeighbors:', formatTerrainTypeList(neighbors));
  for (let se of neighbors) {
    for (let ne of neighbors) {
      for (let n of neighbors) {
        for (let nw of neighbors) {
          for (let sw of neighbors) {
            for (let s of neighbors) {
              variants.push(...createTilesetVariants(terrainType, {
                [Direction.SE]: se,
                [Direction.NE]: ne,
                [Direction.N]: n,
                [Direction.NW]: nw,
                [Direction.SW]: sw,
                [Direction.S]: s,
              }));
            }
          }
        }
      }
    }
  }
  // console.log(variants.map(i => [i.variantID, i.mask]));
  console.log(`\tCreated ${variants.length} variants for terrain type ${terrainTypeTitles[terrainType]}`);
  return variants;
}

function removeDuplicateVariants(variants: TileVariant[]): TileVariant[] {
  const uniqueVariants = new Map();
  for (const variant of variants) {
    uniqueVariants.set(variant.mask, variant);
  }
  return Array.from(uniqueVariants.values());
}

async function createTileset() {
  const variants = terrainTypes.slice(1).reduce((prev, terrainType) => [...prev, ...getVariantsForTerrainType(terrainType)], []);
  const outImagePath = getFilePath(argv.outputPath, argv.tilesetName + '.tileset.png');
  const outJSONPath = getFilePath(argv.outputPath, argv.tilesetName + '.tileset.json');

  await createTilesetImage(variants, argv.columns, outImagePath);
  console.log(`Output tileset image: ${outImagePath}`);

  fs.writeFileSync(outJSONPath, JSON.stringify({
    columns: argv.columns,
    padding: argv.padding,
    tileSize: {
      width: tileWidth,
      height: tileHeight,
    },
    tiles: variants.map((tile, index) => ({
      id: index,
      used: true,
      terrainType: tile.terrainTypeCenter,
      neighborTerrainTypes: Object.values(tile.neighborTerrainTypes),
      mask: tile.mask,
      variantID: tile.variantID,
      sideTileIDs: tile.sideTileIDs,
    }))
  }, null, 2))
  console.log(`Output tileset json: ${outJSONPath}`);
}

async function main() {
  try {
    await loadFiles();
    await createTileset();
  } catch (err) {
    console.error(err);
    process.exit(0);
  }
}

main();
