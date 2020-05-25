import { TerrainType, Direction } from './constants';

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
    ((3 ** 0) * terrainType) +
    ((3 ** (Direction.SE + 1)) * neighborTerrainTypes[Direction.SE]) + 
    ((3 ** (Direction.NE + 1)) * neighborTerrainTypes[Direction.NE]) + 
    ((3 ** (Direction.N + 1)) * neighborTerrainTypes[Direction.N]) + 
    ((3 ** (Direction.NW + 1)) * neighborTerrainTypes[Direction.NW]) + 
    ((3 ** (Direction.SW + 1)) * neighborTerrainTypes[Direction.SW]) + 
    ((3 ** (Direction.S + 1)) * neighborTerrainTypes[Direction.S])
  );
}