import * as PIXI from "pixi.js";
import * as Honeycomb from 'honeycomb-grid';
import ndarray from "ndarray";
import SimplexNoise from 'simplex-noise';
import Alea from 'alea';
import { map, clamp, last } from "lodash";
import { IHex, Grid } from "./MapViewer";
import { Direction, terrainTypeTitles, TerrainType, oddq_directions, directionTitles, renderOrder, indexOrder, oppositeDirections, adjacentDirections } from './constants';
import { octaveNoise, logGroupTime } from './utils';
import { Subject } from 'rxjs';
import { MultiDictionary } from "typescript-collections";

PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST;

export interface IWorldOptions {
  size: number;
  sealevel: number;
  seed: string;
}

export type Edge = {
  id: number;
  direction: Direction;
  h1: WorldMapHex;
  h2: WorldMapHex;
  p1: Honeycomb.Point,
  p2: Honeycomb.Point,
  o1: WorldMapHex;
  o2: WorldMapHex;
  p1_edges?: [Edge, Edge];
  p2_edges?: [Edge, Edge];
  upstream?: number;
  height?: number;
}

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
  seed: string;

  hexgrid: Honeycomb.Grid<WorldMapHex>;
  terrain: ndarray;
  heightmap: ndarray;
  private indexMap: Map<string, number>;
  private pointsMap: Map<string, [number, number]>;
  
  public terrainUpdates$: Subject<WorldMapHex[]>;
  rivers: Edge[][];
  hexRiverEdges: MultiDictionary<WorldMapHex, Direction>;
  hexRiverPoints: MultiDictionary<WorldMapHex, [Honeycomb.Point, Honeycomb.Point]>;

  constructor(
    options: IWorldOptions
  ) {
    this.size = {
      width: options.size * 2,
      height: options.size,
    };
    this.seed = options.seed;
    this.hexgrid = Grid.rectangle({
      width: this.size.width,
      height: this.size.height
    });
    this.hexgrid;
    const arraySize = this.size.width * this.size.height;
    const arrayDim = [this.size.width, this.size.height];
    const terrainBuffer = new SharedArrayBuffer(Uint32Array.BYTES_PER_ELEMENT * arraySize);
    this.terrain = ndarray(new Uint32Array(terrainBuffer), arrayDim);

    const heightBuffer = new SharedArrayBuffer(Float32Array.BYTES_PER_ELEMENT * arraySize);
    this.heightmap = ndarray(new Float32Array(heightBuffer), arrayDim);

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
    return this.hexgrid[this.indexMap.get(`${x},${y}`)] || null;
    // return this.hexgrid.get({ x, y });
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

  @logGroupTime('generate')
  generate() {
    this.generateTerrain();
    this.generateRivers();
  }

  @logGroupTime('generateTerrain')
  generateTerrain() {
    const rng = Alea(this.seed);
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

  @logGroupTime('generateRivers')
  generateRivers() {
    // build a list of hex edges, calculate slope
    let hexEdges: Edge[] = [];
    let hexIDs: Map<number, Edge> = new Map();
    let hexEdgesMap: Map<WorldMapHex, Record<Direction, Edge | null>> = new Map();
    const getEmptyEdgeMap = (): Record<Direction, Edge> => ({
      [Direction.SE]: null,
      [Direction.NE]: null,
      [Direction.N]: null,
      [Direction.NW]: null,
      [Direction.SW]: null,
      [Direction.S]: null,
    });
    this.hexgrid.forEach((hex, index) => {
      const neighbors = this.getHexNeighbors(hex);
      const edges = hexEdgesMap.get(hex) || getEmptyEdgeMap();
      const corners = hex.corners().map(p => p.add(this.getHexPosition(hex.x, hex.y)));
      // console.log(corners);
      const directionEdgeCoords: Record<Direction, Honeycomb.Point[]> = {
        [Direction.SE]: [corners[0], corners[1]],
        [Direction.NE]: [corners[5], corners[0]],
        [Direction.N]: [corners[4], corners[5]],
        [Direction.NW]: [corners[3], corners[4]],
        [Direction.SW]: [corners[2], corners[3]],
        [Direction.S]: [corners[1], corners[2]],
      }
      for (const dir of indexOrder) {
        if (neighbors[dir]) {
          if (!hexEdgesMap.has(neighbors[dir])) {
            hexEdgesMap.set(neighbors[dir], getEmptyEdgeMap());
          }
          const [adj1Dir, adj2Dir ] = adjacentDirections[dir];
          const id = (
            ((this.size.width * this.size.height ** 0) * hex.index) + 
            ((this.size.width * this.size.height ** 1) * neighbors[dir].index) +
            ((indexOrder.length ** 3) * dir)
          );
          if (hexIDs.has(id)) {
            edges[dir] = hexEdgesMap.get(neighbors[dir])[oppositeDirections[dir]];
          } else {
            const edge: Edge = {
              direction: dir,
              id,
              h1: hex,
              h2: neighbors[dir],
              p1: directionEdgeCoords[dir][0],
              p2: directionEdgeCoords[dir][1],
              o1: neighbors[adj1Dir],
              o2: neighbors[adj2Dir],
            }
            edges[dir] = edge;
            hexEdges.push(edge);
            hexEdgesMap.get(neighbors[dir])[oppositeDirections[dir]] = edge;
          }
          
        }
      }
      hexEdgesMap.set(hex, edges);
    });

    // find adjacent edges for each edge
    this.hexgrid.forEach((hex, index) => {
      const edges = hexEdgesMap.get(hex);
      for (const dir of indexOrder) {
        if (edges[dir]) {
          const edge = edges[dir];
          const [adj1, adj2] = adjacentDirections[dir];
          const opposite_hex = edge.h2;
          const opposite_dir = oppositeDirections[dir];
          const opposite_dir_adj = adjacentDirections[opposite_dir];
          const o1_edge = hexEdgesMap.get(opposite_hex)[opposite_dir_adj[0]];
          const o2_edge = hexEdgesMap.get(opposite_hex)[opposite_dir_adj[1]];
          edge.p1_edges = [edges[adj1], o1_edge];
          edge.p2_edges = [edges[adj2], o2_edge];
        }
      }
      hexEdgesMap.set(hex, edges);
    });
    console.log('hexEdges', hexEdges);
    console.log('hexEdgesMap', hexEdgesMap);

    // calculate upstream edge and heights
    const getEdgeHeight = (edge: Edge) => Math.max((this.heightmap.get(edge.h1.x, edge.h1.y) + this.heightmap.get(edge.h2.x, edge.h2.y)) / 2);
    for (const edge of hexEdges) {
      if (
        edge.o1 && edge.o2
      ) {
        edge.upstream = this.heightmap.get(edge.o1.x, edge.o1.y) < this.heightmap.get(edge.o2.x, edge.o2.y)
          ? 2
          : 1;
        edge.height = getEdgeHeight(edge);
      }
    }

    const coastlineEdges: Edge[] = [];

    // find coastline
    for (const edge of hexEdges) {
      if (
        edge.o1 && edge.o2 &&
        this.getTerrainForCoord(edge.h1.x, edge.h1.y) !== TerrainType.OCEAN &&
        this.getTerrainForCoord(edge.h2.x, edge.h2.y) !== TerrainType.OCEAN &&
        this.getTerrainForCoord(edge.h1.x, edge.h1.y) !== TerrainType.GLACIAL &&
        this.getTerrainForCoord(edge.h2.x, edge.h2.y) !== TerrainType.GLACIAL &&
        (
          (this.getTerrainForCoord(edge.o1.x, edge.o1.y) === TerrainType.OCEAN &&
          this.getTerrainForCoord(edge.o2.x, edge.o2.y) !== TerrainType.OCEAN) ||
          (this.getTerrainForCoord(edge.o1.x, edge.o1.y) !== TerrainType.OCEAN &&
          this.getTerrainForCoord(edge.o2.x, edge.o2.y) === TerrainType.OCEAN)
        )
      ) {
        coastlineEdges.push(edge);
      }
    }

    console.log('coastlineEdges', coastlineEdges);

    // build rivers
    const edgeHasRiver: Map<number, boolean> = new Map();

    const buildRiver = (currentEdge: Edge, lastEdges: Edge[] = []): Edge[] => {
      let highestEdge: Edge = null;
      let highestEdgeHeight = -Infinity;
      const edges = [
        ...(currentEdge.p1_edges || []),
        ...(currentEdge.p2_edges || []),
      ];
      if (
        edges.length === 0 ||
        edgeHasRiver.has(currentEdge.id) ||
        (
          lastEdges.length > 0
          ? (
            this.getTerrainForCoord(currentEdge.o1.x, currentEdge.o1.y) === TerrainType.OCEAN ||
            this.getTerrainForCoord(currentEdge.o2.x, currentEdge.o2.y) === TerrainType.OCEAN
          )
          : false
        )
      ) {
        return lastEdges;
      }
      for (const edge of edges) {
        if (edge && edge.height > highestEdgeHeight) {
          highestEdge = edge;
          highestEdgeHeight = edge.height;
        }
      }
      if (highestEdgeHeight > currentEdge.height) {
        edgeHasRiver.set(currentEdge.id, true);
        if (edgeHasRiver.get(highestEdge.id)) {
          return lastEdges;
        }
        return buildRiver(highestEdge, [...lastEdges, currentEdge]);
      }
      return lastEdges;
    }

    const rng = Alea(this.seed);

    this.rivers = coastlineEdges
      .filter(i => rng() < 0.33)
      .map(edge => buildRiver(edge))
      .filter(edges => edges.length > 0);
    console.log('rivers', this.rivers);

    this.hexRiverEdges = new MultiDictionary();
    this.hexRiverPoints = new MultiDictionary();
    for (const riverEdges of this.rivers) {
      for (const edge of riverEdges) {
        this.hexRiverEdges.setValue(edge.h1, edge.direction);
        this.hexRiverEdges.setValue(edge.h2, oppositeDirections[edge.direction]);
        this.hexRiverPoints.setValue(edge.h1, [edge.p1, edge.p2]);
        this.hexRiverPoints.setValue(edge.h2, [edge.p1, edge.p2]);
      }
    }
    console.log('hexRiverEdges', this.hexRiverEdges);
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
      [Direction.SE]: se_hex,
      [Direction.NE]: ne_hex,
      [Direction.N]: n_hex,
      [Direction.NW]: nw_hex,
      [Direction.SW]: sw_hex,
      [Direction.S]: s_hex,
    }
  }

  getHexNeighbor(x: number, y: number, direction: Direction) {
    const coord = this.getHexNeighborCoord(x, y, direction);
    return this.getHex(coord[0], coord[1]);
  }

  getHexNeighborCoord(x: number, y: number, direction: Direction) {
    const parity = x & 1;
    const dir = oddq_directions[parity][direction];
    const coord = [x + dir[0], y + dir[1]];
    return coord;
  }

  getTerrainForCoord(x: number, y: number) {
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
    const se_hex = this.getHexNeighborCoord(x, y, Direction.SE);
    const se_hex_terrain = this.getTerrainForCoord(se_hex[0], se_hex[1]);

    const ne_hex = this.getHexNeighborCoord(x, y, Direction.NE);
    const ne_hex_terrain = this.getTerrainForCoord(ne_hex[0], ne_hex[1]);

    const n_hex = this.getHexNeighborCoord(x, y, Direction.N);
    const n_hex_terrain = this.getTerrainForCoord(n_hex[0], n_hex[1]);

    const nw_hex = this.getHexNeighborCoord(x, y, Direction.NW);
    const nw_hex_terrain = this.getTerrainForCoord(nw_hex[0], nw_hex[1]);

    const sw_hex = this.getHexNeighborCoord(x, y, Direction.SW);
    const sw_hex_terrain = this.getTerrainForCoord(sw_hex[0], sw_hex[1]);

    const s_hex = this.getHexNeighborCoord(x, y, Direction.S);
    const s_hex_terrain = this.getTerrainForCoord(s_hex[0], s_hex[1]);

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
