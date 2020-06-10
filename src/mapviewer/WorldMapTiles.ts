import * as Honeycomb from 'honeycomb-grid';
import ndarray from "ndarray";
import { countBy, sortBy } from "lodash";
import { IHex } from "./MapViewer";
import { Direction, terrainTypeTitles, TerrainType, terrainTransitions, terrainBackTransitions } from './constants';
import { getTilesetMask } from './utils';
import { WorldMap, WorldMapHex } from "./WorldMap";
import { Subject } from 'rxjs';


export class WorldMapTiles {
  tileMasks: ndarray;
  
  public tileMaskUpdates$: Subject<WorldMapHex[]>;

  constructor(public worldMap: WorldMap) {
    const size = worldMap.size;
    const arraySize = Uint32Array.BYTES_PER_ELEMENT * size.width * size.height;
    const arrayDim = [size.width, size.height];
    const tileIDBuffer = new SharedArrayBuffer(arraySize);
    this.tileMasks = ndarray(new Uint32Array(tileIDBuffer), arrayDim);

    this.tileMaskUpdates$ = new Subject();
    this.worldMap.hexgrid.forEach((hex, index) => {
      this.calculateHexTile(hex);
    });


    // subscribe to hex terrain updates and recalculate terrain masks
    this.worldMap.terrainUpdates$.subscribe(updatedHexes => {
      for (const hex of updatedHexes) {
        this.calculateHexTile(hex);
        const updatedHexes = [hex];
        for (const nhex of Object.values(this.worldMap.getHexNeighbors(hex))) {
          this.calculateHexTile(nhex);
          updatedHexes.push(nhex);
        }
        this.tileMaskUpdates$.next(updatedHexes);
      }
    });
  }

  get tileStats() {
    const grouped = countBy(this.tileMasks.data);

    let maskNeighbors = {};

    Object.keys(grouped).forEach(tileID => {
      const firstHex = this.worldMap.hexgrid.find(hex => this.tileMasks.get(hex.x, hex.y) === parseInt(tileID));
      if (!firstHex) {
        maskNeighbors[tileID] = null;
        return;
      }
      let data = {};
      this.worldMap.hexgrid.neighborsOf(firstHex).forEach((hex, nindex) => {
        const direction = Direction[nindex];
        if (hex === undefined) {
          data[direction] = null;
        }
        else {
          const terrainType = this.worldMap.terrain.data[hex.index];
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
        ({ count }) => count).reverse(),
      maskNeighbors,
    };
  }

  calculateHexTile(hex: Honeycomb.Hex<IHex>) {
    const { x, y } = hex;
    const terrainType = this.worldMap.getTerrainForCoord(x, y);
    const neighborTerrainTypes = this.worldMap.getHexNeighborTerrain(x, y);

    const mask = getTilesetMask(terrainType, neighborTerrainTypes);

    this.tileMasks.set(x, y, mask);
    return mask;
  }
}
