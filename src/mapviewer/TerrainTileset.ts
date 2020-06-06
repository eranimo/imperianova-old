import * as PIXI from "pixi.js";
import { Direction, directionShort, TerrainType } from './constants';
import { getTilesetMask } from './utils';


export type TerrainTile = {
  id: number;
  used: boolean;
  terrainType: number;
  neighborTerrainTypes: Record<Direction, number>;
  mask: number;
}

export type TerrainTilesetOptions = {
  columns: number;
  tileSize: {
    width: number,
    height: number,
  };
  padding: number,
  tiles: TerrainTile[];
}

const typeParsers = {
  'int': (value: string) => parseInt(value, 10),
  'bool': (value: string) => value === 'true'
}

type XMLTileProperties = {
  '0 - SE': string,
  '1 - NE': string,
  '2 - N': string,
  '3 - NW': string,
  '4 - SW': string,
  '5 - S': string,
  used: boolean,
  terrainType: number,
}

export class TerrainTileset {
  tileTextures: Map<number, PIXI.Texture>;
  tileMask: Map<number, TerrainTile[]>;

  constructor(
    public baseTexture: PIXI.BaseTexture,
    public options: TerrainTilesetOptions,
  ) {

    const { padding, tileSize: { width, height } } = this.options;
    this.tileTextures = new Map();
    this.tileMask = new Map();
    for (const tile of options.tiles) {
      if (tile.used) {
        const texture = new PIXI.Texture(this.baseTexture, new PIXI.Rectangle(
          (tile.id % this.options.columns) * (width + padding),
          (Math.floor(tile.id / this.options.columns)) * (height + padding),
          width,
          height
        ));
        this.tileTextures.set(tile.id, texture);
        if (this.tileMask.has(tile.mask)) {
          this.tileMask.get(tile.mask).push(tile);
        } else {
          this.tileMask.set(tile.mask, [tile]);
        }
      }
    }
  }

  static fromJSON(
    baseTexture: PIXI.BaseTexture,
    tilesetData: any
  ) {
    return new TerrainTileset(baseTexture, tilesetData);
  }

  static fromXML(
    baseTexture: PIXI.BaseTexture,
    document: Document
  ) {
    const tiles = document.querySelectorAll('tile');
    const tileset = document.querySelector('tileset');
    let options = {
      columns: parseInt(tileset.getAttribute('columns'), 10),
      padding: parseInt(tileset.getAttribute('padding'), 10),
      tileSize: {
        width: parseInt(tileset.getAttribute('tilewidth'), 10),
        height: parseInt(tileset.getAttribute('tileheight'), 10),
      },
      tiles: [],
    };
    tiles.forEach(tile => {
      const properties = {};
      for (const property of Array.from(tile.children[0].children)) {
        const type = property.getAttribute('type');
        if (type) {
          const parser = typeParsers[type];
          properties[property.getAttribute('name')] = parser(property.getAttribute('value'));
        }
      }
      const neighborTerrainTypes = {
        [Direction.SE]: (properties as XMLTileProperties)[`${Direction.SE} - ${directionShort[Direction.SE]}`],
        [Direction.NE]: (properties as XMLTileProperties)[`${Direction.NE} - ${directionShort[Direction.NE]}`],
        [Direction.N]: (properties as XMLTileProperties)[`${Direction.N} - ${directionShort[Direction.N]}`],
        [Direction.NW]: (properties as XMLTileProperties)[`${Direction.NW} - ${directionShort[Direction.NW]}`],
        [Direction.SW]: (properties as XMLTileProperties)[`${Direction.SW} - ${directionShort[Direction.SW]}`],
        [Direction.S]: (properties as XMLTileProperties)[`${Direction.S} - ${directionShort[Direction.S]}`],
      }
      const terrainType = (properties as XMLTileProperties).terrainType;
      options.tiles.push({
        id: parseInt(tile.getAttribute('id'), 10),
        used: (properties as XMLTileProperties).used,
        terrainType,
        neighborTerrainTypes,
        mask: getTilesetMask(terrainType, neighborTerrainTypes),
      });
    });
    return new TerrainTileset(baseTexture, options);
  }

  getTextureFromTileMask(mask: number): PIXI.Texture | null {
    if (this.tileMask.has(mask)) {
      return this.tileTextures.get(this.tileMask.get(mask)[0].id);
    }
    return null;
  }
}
