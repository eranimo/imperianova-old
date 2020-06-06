import * as PIXI from "pixi.js";
import { Direction, directionShort, TerrainType, adjacentDirections, renderOrder, terrainTypeTitles, terrainBackTransitions } from './constants';
import { mapValues, random, groupBy, mapKeys } from "lodash";
import {MultiDictionary } from 'typescript-collections';


export type SectionalTilesetTile = {
  tileID: number;
  tileHash: string;
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
  tileTextures: Map<number, PIXI.Texture>;
  tileHashToID: MultiDictionary<string, number>;

  constructor(
    public baseTexture: PIXI.BaseTexture,
    public options: SectionalTilesetOptions,
  ) {
    const { padding, tileSize: { width, height } } = this.options;
    this.tileTextures = new Map();
    this.tileHashToID = new MultiDictionary();

    for (const tile of options.sectionalTiles) {
      const texture = new PIXI.Texture(this.baseTexture, new PIXI.Rectangle(
        (tile.tileID % this.options.columns) * (width + padding),
        (Math.floor(tile.tileID / this.options.columns)) * (height + padding),
        width,
        height
      ));
      this.tileHashToID.setValue(tile.tileHash, tile.tileID);
      this.tileTextures.set(tile.tileID, texture);
    }

    (window as any).SectionalTileset = this;
  }

  static fromXML(
    baseTexture: PIXI.BaseTexture,
    document: Document
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
        tileHash: SectionalTileset.getTileHash(terrainType, terrainTypeCenter, Direction[direction], adj1TerrainType, adj2TerrainType),
        terrainType,
        terrainTypeCenter,
        direction: Direction[direction],
        adj1TerrainType,
        adj2TerrainType,
      });
    });
    return new SectionalTileset(baseTexture, options);
  }

  static getTileHash(
    terrainType: TerrainType,
    terrainTypeCenter: TerrainType,
    direction: Direction,
    adj1TerrainType: TerrainType,
    adj2TerrainType: TerrainType,
  ) {
    return [terrainType, terrainTypeCenter, direction, adj1TerrainType, adj2TerrainType].join(',')
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
    terrainTypeCenter: TerrainType,
    neighborTerrainTypes: Record<Direction, TerrainType>,
  ): PIXI.Texture[] {
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

    return renderOrder.map(dir => {
      const [adjDir1, adjDir2] = adjacentDirections[dir];
      const terrainType = newNeighborTerrainTypes[dir];
      const adj1TerrainType = newNeighborTerrainTypes[adjDir1];
      const adj2TerrainType = newNeighborTerrainTypes[adjDir2];
      const hash = SectionalTileset.getTileHash(terrainType, terrainTypeCenter, dir, adj1TerrainType, adj2TerrainType);
      const possibleTiles = this.tileHashToID.getValue(hash);
      const chosenTile = possibleTiles[random(possibleTiles.length - 1)];
      if (chosenTile === undefined || !this.tileTextures.has(chosenTile)) {
        // console.error(`Could not find tile: dir: ${directionShort[dir]}, terrainType: ${terrainTypeTitles[terrainType]}, terrainTypeCenter: ${terrainTypeTitles[terrainTypeCenter]}, adj1TerrainType: ${terrainTypeTitles[adj1TerrainType]}, adj2TerrainType: ${terrainTypeTitles[adj2TerrainType]}`)
        return null;
      }
      return this.tileTextures.get(chosenTile);
    });
  }
}
