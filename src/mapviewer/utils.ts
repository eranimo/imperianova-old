import { TerrainType, Direction, terrainTypeMax } from './constants';

export function octaveNoise(
  noiseFunc: (x: number, y: number, z: number) => number,
  x: number,
  y: number,
  z: number,
  octaves: number,
  persistence: number) {
  let total = 0;
  let frequency = 1;
  let amplitude = 1;
  let maxValue = 0; // Used for normalizing result to 0.0 - 1.0
  for (let i = 0; i < octaves; i++) {
    total += noiseFunc(x * frequency, y * frequency, z * frequency) * amplitude;
    maxValue += amplitude;
    amplitude *= persistence;
    frequency *= 2;
  }

  return total / maxValue;
}


export function logFuncTime<T>(label: string, func: () => T) {
  console.time(label);
  const value = func();
  console.timeEnd(label);
  return value;
}

export function logGroupTime(label: string, closed: boolean = false) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    descriptor.value = function (...args: any[]) {
      if (closed) {
        console.groupCollapsed(label);
      } else {
        console.group(label);
      }
      console.time(label);
      const result = originalMethod.apply(this, args);
      console.timeEnd(label);
      console.groupEnd();
      return result;
    }
  }
}

export function loadXML(xmlString: string) {
  const parser = new DOMParser();
  const xml = parser.parseFromString(xmlString, 'text/xml');
  return xml;
}

export function getTilesetMask(
  terrainType: TerrainType,
  neighborTerrainTypes: Record<Direction, TerrainType>,
) {
  return (
    ((terrainTypeMax ** 0) * terrainType) +
    ((terrainTypeMax ** (Direction.SE + 1)) * neighborTerrainTypes[Direction.SE]) + 
    ((terrainTypeMax ** (Direction.NE + 1)) * neighborTerrainTypes[Direction.NE]) + 
    ((terrainTypeMax ** (Direction.N + 1)) * neighborTerrainTypes[Direction.N]) + 
    ((terrainTypeMax ** (Direction.NW + 1)) * neighborTerrainTypes[Direction.NW]) + 
    ((terrainTypeMax ** (Direction.SW + 1)) * neighborTerrainTypes[Direction.SW]) + 
    ((terrainTypeMax ** (Direction.S + 1)) * neighborTerrainTypes[Direction.S])
  );
}

export class Grid2D<T> {
  protected value: T[];

  constructor(
    public width: number,
    public height: number,
    initialValue: T[] = [],
  ) {
    this.value = initialValue;
  }

  private getIndex(x: number, y: number) {
    return x + this.width * y;
  }

  set(x: number, y: number, value: T) {
    this.value[this.getIndex(x, y)] = value;
  }

  get(x: number, y: number) {
    return this.value[this.getIndex(x, y)];
  }

  fill(value: T) {
    for (let x = 0; x < this.width; x++) {
      for (let y = 0; y < this.height; y++) {
        this.set(x, y, value);
      }
    }
    return this;
  }

  *[Symbol.iterator](): Iterator<[number, number, T]> {
    for (let x = 0; x < this.width; x++) {
      for (let y = 0; y < this.height; y++) {
        yield [x, y, this.get(x, y)];
      }
    }
  }
}
