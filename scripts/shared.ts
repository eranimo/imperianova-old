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
  variantID: string;
  mask: number;
};

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


export const propertyTypeProcess = {
  int: (value: string) => parseInt(value, 10),
  str: (value: string) => value,
  bool: (value: string) => value === 'true',
}