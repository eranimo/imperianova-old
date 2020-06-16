import path from 'path';
import Jimp from 'jimp';

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