import path from 'path';
import { TerrainType, Direction } from '../src/mapviewer/constants';
import Jimp from 'jimp';


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
  mask: number;
};

export const adjacentDirections = {
  [Direction.SE]: [Direction.NE, Direction.S],
  [Direction.NE]: [Direction.N, Direction.SE],
  [Direction.N]: [Direction.NW, Direction.NE],
  [Direction.NW]: [Direction.SW, Direction.N],
  [Direction.SW]: [Direction.NW, Direction.S],
  [Direction.S]: [Direction.SW, Direction.SE],
};

export const renderOrder = [
  Direction.N,
  Direction.NW,
  Direction.NE,
  Direction.SW,
  Direction.SE,
  Direction.S,
];

export const indexOrder = [
  Direction.SE,
  Direction.NE,
  Direction.N,
  Direction.NW,
  Direction.SW,
  Direction.S,
]

export async function newImage(width: number, height: number): Promise<Jimp> {
  return new Promise((resolve, reject) => {
    new Jimp(width, height, (err, image) => {
      if (err) {
        reject(err);
      } else {
        resolve(image);
      }
    })
  })
}

export function getFilePath(...paths: string[]) {
  return path.resolve(__dirname, '../', ...paths);
}
