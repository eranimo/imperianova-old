
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