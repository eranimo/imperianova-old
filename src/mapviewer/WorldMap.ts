import * as PIXI from "pixi.js";
import * as Honeycomb from 'honeycomb-grid';
import ndarray from "ndarray";
import SimplexNoise from 'simplex-noise';
import Alea from 'alea';
import { countBy, map, sortBy } from "lodash";
import { IHex, Grid } from "./MapViewer";
import { Direction, terrainTypeTitles, TerrainType, oddq_directions, directionTitles } from './constants';
import { octaveNoise, getTilesetMask } from './utils';

PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST;

export class WorldMap {
  size: {
    width: number;
    height: number;
  };
  hexgrid: Honeycomb.Grid<Honeycomb.Hex<IHex>>;
  terrain: ndarray;
  heightmap: ndarray;
  tileMasks: ndarray;
  indexMap: Map<string, number>;

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

    const tileIDBuffer = new SharedArrayBuffer(arraySize);
    this.tileMasks = ndarray(new Uint32Array(tileIDBuffer), arrayDim);
    this.indexMap = new Map();
  }

  get tileStats() {
    const grouped = countBy(this.tileMasks.data);

    let maskNeighbors = {};

    Object.keys(grouped).forEach(tileID => {
      const firstHex = this.hexgrid.find(hex => this.tileMasks.get(hex.x, hex.y) === parseInt(tileID));
      if (!firstHex) {
        maskNeighbors[tileID] = null;
        return;
      }
      let data = {};
      this.hexgrid.neighborsOf(firstHex).forEach((hex, nindex) => {
        const direction = Direction[nindex];
        if (hex === undefined) {
          data[direction] = null;
        }
        else {
          const terrainType = this.terrain.data[hex.index];
          data[direction] = `${terrainType} - ${terrainTypeTitles[terrainType]}`;
        }
      });
      maskNeighbors[tileID] = data;
    });

    return {
      tileMaskCount: grouped,
      distinctTileMasks: Object.keys(grouped).length,
      mostCommonMasks: sortBy(
        Object.entries(grouped).map(i => ({
          mask: i[0],
          count: i[1],
          neighbors: maskNeighbors[i[0]],
        })),
        ({ count }) => count,
      ).reverse(),
      maskNeighbors,
    };
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

  getHexCoordinate(hex: Honeycomb.Hex<IHex>) {
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
      if (height < 140) {
        this.terrain.set(hex.x, hex.y, TerrainType.OCEAN);
      } else {
        this.terrain.set(hex.x, hex.y, TerrainType.LAND);
      }
    });
    this.hexgrid.forEach(hex => {
      this.calculateHexTile(hex);
    })
  }

  getHexNeighbor(x: number, y: number, direction: Direction) {
    const parity = x & 1;
    const dir = oddq_directions[parity][direction];
    return [x + dir[0], y + dir[1]];
  }

  getTerrainForHex(x: number, y: number) {
    const index = this.indexMap.get(`${x},${y}`);
    return this.terrain.data[index] === undefined
      ? TerrainType.MAP_EDGE
      : this.terrain.data[index];
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
    return {
      [directionTitles[Direction.SE]]: terrainTypeTitles[neighborTerrainTypes[Direction.SE]],
      [directionTitles[Direction.NE]]: terrainTypeTitles[neighborTerrainTypes[Direction.NE]],
      [directionTitles[Direction.N]]:  terrainTypeTitles[neighborTerrainTypes[Direction.N]],
      [directionTitles[Direction.NW]]: terrainTypeTitles[neighborTerrainTypes[Direction.NW]],
      [directionTitles[Direction.SW]]: terrainTypeTitles[neighborTerrainTypes[Direction.SW]],
      [directionTitles[Direction.S]]:  terrainTypeTitles[neighborTerrainTypes[Direction.S]],
    }
  }

  calculateHexTile(hex: Honeycomb.Hex<IHex>) {
    const { x, y } = hex;
    const terrain = this.getTerrainForHex(x, y);
    if (terrain === TerrainType.LAND) {
      this.tileMasks.set(x, y, 2186);
      return;
    }
    const neighborTerrainTypes = this.getHexNeighborTerrain(x, y);

    const mask = getTilesetMask(terrain, neighborTerrainTypes);

    this.tileMasks.set(x, y, mask);
  }
}
