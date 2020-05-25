import * as PIXI from "pixi.js";
import { Direction, directionShort, TerrainType } from './constants';

const foo = import('file-loader!../assets/template.xml');

type Tile = {
  id: number;
  used: boolean;
  terrainType: number;
  neighborTerrainTypes: Record<Direction, number>;
  mask: number;
}

type TilesetOptions = {
  columns: number;
  tileSize: {
    width: number,
    height: number,
  };
  tiles: Tile[];
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
  tileMask: Map<number, Tile[]>;

  constructor(
    public baseTexture: PIXI.BaseTexture,
    public options: TilesetOptions,
  ) {

    const { width, height } = this.options.tileSize;
    this.tileTextures = new Map();
    this.tileMask = new Map();
    for (const tile of options.tiles) {
      if (tile.used) {
        const texture = new PIXI.Texture(this.baseTexture, new PIXI.Rectangle(
          (tile.id % this.options.columns) * width,
          (Math.floor(tile.id / this.options.columns)) * height,
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
    console.log('ocean', this.tileMask.get(1093));
  }

  static fromXML(
    baseTexture: PIXI.BaseTexture,
    document: Document
  ) {
    const tiles = document.querySelectorAll('tile');
    const tileset = document.querySelector('tileset');
    let options = {
      columns: parseInt(tileset.getAttribute('columns'), 10),
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
        mask: (
          ((3 ** 0) * terrainType) +
          ((3 ** (Direction.SE + 1)) * neighborTerrainTypes[Direction.SE]) + 
          ((3 ** (Direction.NE + 1)) * neighborTerrainTypes[Direction.NE]) + 
          ((3 ** (Direction.N + 1)) * neighborTerrainTypes[Direction.N]) + 
          ((3 ** (Direction.NW + 1)) * neighborTerrainTypes[Direction.NW]) + 
          ((3 ** (Direction.SW + 1)) * neighborTerrainTypes[Direction.SW]) + 
          ((3 ** (Direction.S + 1)) * neighborTerrainTypes[Direction.S])
        ),
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
