import * as PIXI from "pixi.js";
import * as Honeycomb from 'honeycomb-grid';
import ndarray from "ndarray";
import SimplexNoise from 'simplex-noise';
import Alea from 'alea';
import { map, clamp } from "lodash";
import { IHex, Grid } from "./MapViewer";
import { Direction, terrainTypeTitles, TerrainType, oddq_directions, directionTitles } from './constants';
import { octaveNoise } from './utils';
import { Subject } from 'rxjs';

PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST;


export type WorldMapHex = Honeycomb.Hex<IHex>;
/**
 * A wrapper class around Honeycomb.Grid
 * Holds data about world
 * 
 * Subjects:
 * - terrainUpdates$: list of hexes that have changed their terrain types
 */
export class WorldMap {
  size: PIXI.ISize;
  hexgrid: Honeycomb.Grid<WorldMapHex>;
  terrain: ndarray;
  heightmap: ndarray;
  private indexMap: Map<string, number>;
  private pointsMap: Map<string, [number, number]>;
  
  public terrainUpdates$: Subject<WorldMapHex[]>;

  constructor(
    options: { size: number; }) {
    this.size = {
      width: options.size * 2,
      height: options.size,
    };
    this.hexgrid = Grid.rectangle({
      width: this.size.width,
      height: this.size.height
    });
    this.hexgrid;
    const arraySize = Uint32Array.BYTES_PER_ELEMENT * this.size.width * this.size.height;
    const arrayDim = [this.size.width, this.size.height];
    const terrainBuffer = new SharedArrayBuffer(arraySize);
    this.terrain = ndarray(new Uint32Array(terrainBuffer), arrayDim);

    const heightBuffer = new SharedArrayBuffer(arraySize);
    this.heightmap = ndarray(new Uint32Array(heightBuffer), arrayDim);

    this.indexMap = new Map();
    this.pointsMap = new Map();
    this.terrainUpdates$ = new Subject();
  }

  getHexPosition(x: number, y: number) {
    return this.pointsMap.get(`${x},${y}`);
  }

  setHexTerrain(hex: WorldMapHex, terrainType: TerrainType) {
    this.terrain.set(hex.x, hex.y, terrainType);
    this.terrainUpdates$.next([hex]);
  }

  getHex(x: number, y: number) {
    return this.hexgrid.get({ x, y});
  }

  getHexFromPoint(point: PIXI.Point) {
    const hexCoords = Grid.pointToHex(point.x, point.y);
    return this.hexgrid.get(hexCoords);
  }

  getPointFromPosition(x: number, y: number) {
    const hex = this.hexgrid.get({ x, y });
    if (!hex) return null;
    const p = hex.toPoint();
    return new PIXI.Point(p.x, p.y);
  }

  getHexCoordinate(hex: WorldMapHex) {
    const long = ((hex.x / this.size.width) * 360) - 180;
    const lat = ((-hex.y / this.size.height) * 180) + 90;
    return { lat, long };
  }

  generateTerrain() {
    const seed = Math.random();
    const rng = Alea(seed);
    const noise = new SimplexNoise(rng);
    this.hexgrid.forEach((hex, index) => {
      hex.index = index;
      const point = hex.toPoint();
      this.pointsMap.set(`${hex.x},${hex.y}`, [point.x, point.y]);
      this.indexMap.set(`${hex.x},${hex.y}`, index);
      const { lat, long } = this.getHexCoordinate(hex);
      const inc = ((lat + 90) / 180) * Math.PI;
      const azi = ((long + 180) / 360) * (2 * Math.PI);
      const nx = 1 * Math.sin(inc) * Math.cos(azi);
      const ny = 1 * Math.sin(inc) * Math.sin(azi);
      const nz = 1 * Math.cos(inc);
      const raw = octaveNoise(noise.noise3D.bind(noise), nx, ny, nz, 7, 0.5);
      const value = (raw + 1) / 2;
      const height = value * 255;
      this.heightmap.set(hex.x, hex.y, height);
      if (Math.abs(lat) > 75) {
        const isGlacial = (octaveNoise(noise.noise3D.bind(noise), nx, ny, nz, 7, 2) + 1) / 2;
        const chance = (Math.abs(lat) - 75) / (90 - 75);
        if (isGlacial < chance) {
          this.terrain.set(hex.x, hex.y, TerrainType.GLACIAL);
          return;
        }
      }
      const deg = (octaveNoise(noise.noise3D.bind(noise), nx, ny, nz, 7, 2) + 1) / 2;
      if (Math.abs(lat) > 50 + (deg * 20)) {
        if (height < 140) {
          this.terrain.set(hex.x, hex.y, TerrainType.OCEAN);
        } else if (height < 165) {
          const isTaiga = (octaveNoise(noise.noise3D.bind(noise), nx, ny, nz, 7, 0.5) + 1) / 2;
          this.terrain.set(hex.x, hex.y, isTaiga < 0.55 ? TerrainType.TUNDRA : TerrainType.TAIGA);
        } else {
          this.terrain.set(hex.x, hex.y, TerrainType.TUNDRA);
        }
      } else if (Math.abs(lat) > 40 + (deg * 20)) {
        if (height < 140) {
          this.terrain.set(hex.x, hex.y, TerrainType.OCEAN);
        } else {
          this.terrain.set(hex.x, hex.y, TerrainType.TAIGA);
        }
      } else if (Math.abs(lat) > 30 +(deg * 20)) {
        if (height < 140) {
          this.terrain.set(hex.x, hex.y, TerrainType.OCEAN);
        } else {
          this.terrain.set(hex.x, hex.y, TerrainType.FOREST);
        }
      } else {
        if (height < 140) {
          this.terrain.set(hex.x, hex.y, TerrainType.OCEAN);
        } else if (height < 150) {
          const isForested = (octaveNoise(noise.noise3D.bind(noise), nx, ny, nz, 7, 0.5) + 1) / 2;
          this.terrain.set(hex.x, hex.y, isForested < 0.5 ? TerrainType.GRASSLAND : TerrainType.FOREST);
        } else if (height < 175) {
          this.terrain.set(hex.x, hex.y, TerrainType.GRASSLAND);
        } else {
          this.terrain.set(hex.x, hex.y, TerrainType.DESERT);
        }
      }
    });
  }

  getHexNeighbors(hex: WorldMapHex): Record<Direction, WorldMapHex> {
    const { x, y } = hex;
    const se_hex = this.getHexNeighbor(x, y, Direction.SE);
    const ne_hex = this.getHexNeighbor(x, y, Direction.NE);
    const n_hex = this.getHexNeighbor(x, y, Direction.N);
    const nw_hex = this.getHexNeighbor(x, y, Direction.NW);
    const sw_hex = this.getHexNeighbor(x, y, Direction.SW);
    const s_hex = this.getHexNeighbor(x, y, Direction.S);

    return {
      [Direction.SE]: this.getHex(se_hex[0], se_hex[1]),
      [Direction.NE]: this.getHex(ne_hex[0], ne_hex[1]),
      [Direction.N]: this.getHex(n_hex[0], n_hex[1]),
      [Direction.NW]: this.getHex(nw_hex[0], nw_hex[1]),
      [Direction.SW]: this.getHex(sw_hex[0], sw_hex[1]),
      [Direction.S]: this.getHex(s_hex[0], s_hex[1]),
    }
  }

  getHexNeighbor(x: number, y: number, direction: Direction) {
    const parity = x & 1;
    const dir = oddq_directions[parity][direction];
    return [x + dir[0], y + dir[1]];
  }

  getTerrainForHex(x: number, y: number) {
    if (y === -1 || y === this.size.height) {
      const half = Math.round(this.size.width / 2);
      const nx = clamp(((half + (half - x)) - 1), 0, this.size.width - 1);
      const ny = y === -1 ? 0 : this.size.height - 1;
      return this.terrain.data[this.indexMap.get(`${nx},${ny}`)];
    } else if (x === -1) {
      return this.terrain.data[this.indexMap.get(`${this.size.width - 1},${y}`)];
    } else if (x === this.size.width) {
      return this.terrain.data[this.indexMap.get(`${0},${y}`)];
    }
    return this.terrain.data[this.indexMap.get(`${x},${y}`)];
  }

  getHexNeighborTerrain(x: number, y: number): Record<Direction, TerrainType> {
    const se_hex = this.getHexNeighbor(x, y, Direction.SE);
    const se_hex_terrain = this.getTerrainForHex(se_hex[0], se_hex[1]);

    const ne_hex = this.getHexNeighbor(x, y, Direction.NE);
    const ne_hex_terrain = this.getTerrainForHex(ne_hex[0], ne_hex[1]);

    const n_hex = this.getHexNeighbor(x, y, Direction.N);
    const n_hex_terrain = this.getTerrainForHex(n_hex[0], n_hex[1]);

    const nw_hex = this.getHexNeighbor(x, y, Direction.NW);
    const nw_hex_terrain = this.getTerrainForHex(nw_hex[0], nw_hex[1]);

    const sw_hex = this.getHexNeighbor(x, y, Direction.SW);
    const sw_hex_terrain = this.getTerrainForHex(sw_hex[0], sw_hex[1]);

    const s_hex = this.getHexNeighbor(x, y, Direction.S);
    const s_hex_terrain = this.getTerrainForHex(s_hex[0], s_hex[1]);

    return {
      [Direction.SE]: se_hex_terrain,
      [Direction.NE]: ne_hex_terrain,
      [Direction.N]: n_hex_terrain,
      [Direction.NW]: nw_hex_terrain,
      [Direction.SW]: sw_hex_terrain,
      [Direction.S]: s_hex_terrain,
    }
  }

  debugNeighborTerrain(x: number, y: number) {
    const neighborTerrainTypes = this.getHexNeighborTerrain(x, y);
    const se_hex = this.getHexNeighbor(x, y, Direction.SE);
    const ne_hex = this.getHexNeighbor(x, y, Direction.NE);
    const n_hex = this.getHexNeighbor(x, y, Direction.N);
    const nw_hex = this.getHexNeighbor(x, y, Direction.NW);
    const sw_hex = this.getHexNeighbor(x, y, Direction.SW);
    const s_hex = this.getHexNeighbor(x, y, Direction.S);

    return {
      neighborCoords: {
        [directionTitles[Direction.SE]]: se_hex,
        [directionTitles[Direction.NE]]: ne_hex,
        [directionTitles[Direction.N]]: n_hex,
        [directionTitles[Direction.NW]]: nw_hex,
        [directionTitles[Direction.SW]]: sw_hex,
        [directionTitles[Direction.S]]: s_hex,
      },
      neighborTerrainTypes: {
        [directionTitles[Direction.SE]]: terrainTypeTitles[neighborTerrainTypes[Direction.SE]],
        [directionTitles[Direction.NE]]: terrainTypeTitles[neighborTerrainTypes[Direction.NE]],
        [directionTitles[Direction.N]]:  terrainTypeTitles[neighborTerrainTypes[Direction.N]],
        [directionTitles[Direction.NW]]: terrainTypeTitles[neighborTerrainTypes[Direction.NW]],
        [directionTitles[Direction.SW]]: terrainTypeTitles[neighborTerrainTypes[Direction.SW]],
        [directionTitles[Direction.S]]:  terrainTypeTitles[neighborTerrainTypes[Direction.S]],
      },
    }
  }
}
