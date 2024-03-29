import * as PIXI from "pixi.js";
import { Direction, directionShort, TerrainType, adjacentDirections, renderOrder, terrainTypeTitles, terrainBackTransitions, terrainTypeMax, indexOrder, oppositeDirections } from './constants';
import { mapValues, random, groupBy, mapKeys } from "lodash";
import {MultiDictionary } from 'typescript-collections';
import ndarray from 'ndarray';
import { WorldMapHex, WorldMap } from './WorldMap';


export type SectionalTilesetTile = {
  tileID: number;
  tileMask: number;
  direction: Direction;
  terrainType: TerrainType;
  terrainTypeCenter: TerrainType;
  adj1TerrainType: TerrainType;
  adj2TerrainType: TerrainType;
}

export type SectionalTilesetOptions = {
  columns: number;
  tileSize: {
    width: number,
    height: number,
  };
  padding: number,
  sectionalTiles: SectionalTilesetTile[];
}

const typeParsers = {
  'int': (value: string) => parseInt(value, 10),
  'bool': (value: string) => value === 'true',
  'str': (value: string) => value,
}

type XMLTileProperties = {
  direction: string,
  terrainType: number,
  terrainTypeCenter: number,
  terrainTypeSE?: number;
  terrainTypeNE?: number;
  terrainTypeN?: number;
  terrainTypeNW?: number;
  terrainTypeSW?: number;
  terrainTypeS?: number;
}

export class SectionalTileset {
  sectionalTileTextures: Map<number, PIXI.Texture>;
  sectionalTileMaskToTileIDs: MultiDictionary<number, number>;
  hexTileSectionalTileCache: Map<string, PIXI.Texture[]>;
  hexTileErrors: Map<WorldMapHex, string>;
  hexTileDebugInfo: Map<WorldMapHex, any>;
  hexRivers: MultiDictionary<number, Direction>;
  
  constructor(
    public baseTexture: PIXI.BaseTexture,
    public options: SectionalTilesetOptions,
    size: PIXI.ISize, // TODO: remove
  ) {
    const { padding, tileSize } = this.options;
    this.sectionalTileTextures = new Map();
    this.hexTileSectionalTileCache = new Map();
    this.sectionalTileMaskToTileIDs = new MultiDictionary();
    this.hexTileErrors = new Map();
    this.hexTileDebugInfo = new Map();
    this.hexRivers = new MultiDictionary();

    for (const tile of options.sectionalTiles) {
      const texture = new PIXI.Texture(this.baseTexture, new PIXI.Rectangle(
        Math.round((tile.tileID % this.options.columns) * (tileSize.width + padding)),
        Math.round((Math.floor(tile.tileID / this.options.columns)) * (tileSize.height + padding)),
        tileSize.width,
        tileSize.height
      ));
      this.sectionalTileMaskToTileIDs.setValue(tile.tileMask, tile.tileID);
      this.sectionalTileTextures.set(tile.tileID, texture);
    }

    (window as any).SectionalTileset = this;
  }

  static fromXML(
    baseTexture: PIXI.BaseTexture,
    document: Document,
    size: PIXI.ISize,
  ) {
    const tiles = document.querySelectorAll('tile');
    const tileset = document.querySelector('tileset');
    let options: SectionalTilesetOptions = {
      columns: parseInt(tileset.getAttribute('columns'), 10),
      padding: parseInt(tileset.getAttribute('spacing'), 10),
      tileSize: {
        width: parseInt(tileset.getAttribute('tilewidth'), 10),
        height: parseInt(tileset.getAttribute('tileheight'), 10),
      },
      sectionalTiles: [],
    };
    tiles.forEach(tile => {
      const properties: Partial<XMLTileProperties> = {};
      for (const property of Array.from(tile.children[0].children)) {
        const type = property.getAttribute('type');
        if (type) {
          if (!(type in typeParsers)) {
            throw new Error(`Unrecognized property type ${type}`);
          }
          const parser = typeParsers[type];
          properties[property.getAttribute('name')] = parser(property.getAttribute('value'));
        }
      }
      const { terrainType, terrainTypeCenter, direction } = properties;
      const [adj1Dir, adj2Dir] = adjacentDirections[Direction[direction]];
      const adj1TerrainType = properties[`terrainType${directionShort[adj1Dir]}`];
      const adj2TerrainType = properties[`terrainType${directionShort[adj2Dir]}`];
      options.sectionalTiles.push({
        tileID: parseInt(tile.getAttribute('id'), 10),
        tileMask: SectionalTileset.getTileHash(terrainType, terrainTypeCenter, Direction[direction], adj1TerrainType, adj2TerrainType),
        terrainType,
        terrainTypeCenter,
        direction: Direction[direction],
        adj1TerrainType,
        adj2TerrainType,
      });
    });
    return new SectionalTileset(baseTexture, options, size);
  }

  static getTileHash(
    terrainType: TerrainType,
    terrainTypeCenter: TerrainType,
    direction: Direction,
    adj1TerrainType: TerrainType,
    adj2TerrainType: TerrainType,
  ) {
    return (
      ((terrainTypeMax ** 2) * terrainType) +
      ((terrainTypeMax ** 4) * terrainTypeCenter) +
      ((renderOrder.length ** 6) * direction) +
      ((terrainTypeMax ** 8) * adj1TerrainType) +
      ((terrainTypeMax ** 10) * adj2TerrainType)
    );
  }

  getDebugTiles() {
    return mapValues(mapKeys(groupBy(this.options.sectionalTiles, 'terrainTypeCenter'), (_, t) => terrainTypeTitles[t]), (tiles, key) => 
      mapValues(
        mapKeys(groupBy(tiles, 'terrainType'), (_, t) => terrainTypeTitles[t]),
        tiles => tiles.map(tile => ({
          tileID: tile.tileID,
          direction: directionShort[tile.direction],
          adj1TerrainType: terrainTypeTitles[tile.adj1TerrainType],
          adj2TerrainType: terrainTypeTitles[tile.adj2TerrainType],
        }))
      )
    );
  }

  getTile(
    mask: number,
    terrainTypeCenter: TerrainType,
    neighborTerrainTypes: Record<Direction, TerrainType>,
    worldMap: WorldMap,
    hex: WorldMapHex,
    riverHexPairs: Map<WorldMapHex, Set<WorldMapHex>>,
  ): PIXI.Texture[] {
    // const cachekey = `${mask}-${riverDirections.join('')}`;
    // if (this.hexTileSectionalTileCache.has(cachekey)) {
    //   return this.hexTileSectionalTileCache.get(cachekey);
    // }

    let newNeighborTerrainTypes = neighborTerrainTypes;
    if (terrainTypeCenter in terrainBackTransitions) {
      const terrainTransitions = terrainBackTransitions[terrainTypeCenter] as TerrainType[];
      const neighborsToChange = {};
      Object.entries(neighborTerrainTypes).forEach(([dir, t]) => {
        const check = terrainTransitions.includes(t);
        if (check) {
          neighborsToChange[dir] = t;
        }
        return check;
      });
      newNeighborTerrainTypes = {
        [Direction.SE]: neighborsToChange[Direction.SE] ? terrainTypeCenter : neighborTerrainTypes[Direction.SE],
        [Direction.NE]: neighborsToChange[Direction.NE] ? terrainTypeCenter : neighborTerrainTypes[Direction.NE],
        [Direction.N]: neighborsToChange[Direction.N] ? terrainTypeCenter : neighborTerrainTypes[Direction.N],
        [Direction.NW]: neighborsToChange[Direction.NW] ? terrainTypeCenter : neighborTerrainTypes[Direction.NW],
        [Direction.SW]: neighborsToChange[Direction.SW] ? terrainTypeCenter : neighborTerrainTypes[Direction.SW],
        [Direction.S]: neighborsToChange[Direction.S] ? terrainTypeCenter : neighborTerrainTypes[Direction.S],
      };
    }

    const riverDirections = {};
    if (riverHexPairs.has(hex)) {
      for (const dir of indexOrder) {
        const neighborHex = worldMap.getHexNeighbor(hex.x, hex.y, dir);
        if (riverHexPairs.get(hex).has(neighborHex)) {
          newNeighborTerrainTypes[dir] = TerrainType.RIVER;
          riverDirections[dir] = neighborHex;
        }
      }
    }
    // for each adj dir hex of this river edge that is not ocean terrain,

    const debugInfo = {};
    const sideTiles = {};
    const textures = renderOrder.map(dir => {
      const [adjDir1, adjDir2] = adjacentDirections[dir];
      const terrainType = newNeighborTerrainTypes[dir];
      let adj1TerrainType = newNeighborTerrainTypes[adjDir1];
      let adj2TerrainType = newNeighborTerrainTypes[adjDir2];
      // if (terrainTypeCenter === TerrainType.OCEAN && terrainType !== TerrainType.OCEAN) {
      // check both adjacent direction neighbors for rivers
      const neighborHex = worldMap.getHexNeighbor(hex.x, hex.y, dir);
      const neighborAdj1Hex = worldMap.getHexNeighbor(hex.x, hex.y, adjDir1);
      const neighborAdj2Hex = worldMap.getHexNeighbor(hex.x, hex.y, adjDir2);
      const adjRiverEdges = {};
      if (riverHexPairs.has(neighborHex)) {
        const hexRivers = riverHexPairs.get(neighborHex);
        // console.log('found river', hex, neighborHex, neighborAdj1Hex, neighborAdj2Hex, dir, hexRivers);
        if (hexRivers.has(neighborAdj1Hex)) {
          adjRiverEdges[adjDir1] = [hex, neighborHex, neighborAdj1Hex];
          adj1TerrainType = TerrainType.RIVER;
        } else {
          adjRiverEdges[adjDir1] = false;
        }
        if (hexRivers.has(neighborAdj2Hex)) {
          adjRiverEdges[adjDir2] = [hex, neighborHex, neighborAdj2Hex];
          adj2TerrainType = TerrainType.RIVER;
        } else {
          adjRiverEdges[adjDir2] = false;
        }
      }
      if (riverDirections[dir]) {
        adj1TerrainType = TerrainType.RIVER;
        adj2TerrainType = TerrainType.RIVER;
      }
      const hash = SectionalTileset.getTileHash(terrainType, terrainTypeCenter, dir, adj1TerrainType, adj2TerrainType);
      const possibleTiles = this.sectionalTileMaskToTileIDs.getValue(hash);
      const chosenTile = possibleTiles[random(possibleTiles.length - 1)];
      if (chosenTile === undefined || !this.sectionalTileTextures.has(chosenTile)) {
        const err = `
          Could not find tile:
          
          dir: ${directionShort[dir]}
          terrainType: ${terrainTypeTitles[terrainType]}
          terrainTypeCenter: ${terrainTypeTitles[terrainTypeCenter]}
          adj1TerrainType: ${terrainTypeTitles[adj1TerrainType]}
          adj2TerrainType: ${terrainTypeTitles[adj2TerrainType]})
          
          ${JSON.stringify(newNeighborTerrainTypes, null, 2)}
        `;
        this.hexTileErrors.set(hex, err);
        return null;
      }
      sideTiles[dir] = chosenTile;
      debugInfo[dir] = { hash, possibleTiles, terrainType, adj1TerrainType, adj2TerrainType, chosenTile, adjRiverEdges };
      return this.sectionalTileTextures.get(chosenTile);
    });
    this.hexTileDebugInfo.set(hex, {
      mask,
      debugInfo,
      terrainTypeCenter,
      neighborTerrainTypes,
      riverDirections,
      riverHexPairs: riverHexPairs.get(hex),
      newNeighborTerrainTypes,
      sideTiles,
      // cachekey,
    });
    // this.hexTileSectionalTileCache.set(cachekey, textures);

    return textures;
  }
}
