import * as PIXI from "pixi.js";

export type TilesetOptions = {
  columns: number,
  grid: {
    height: number,
    width: number,
  },
};

export class Tileset {
  tileTextures: Map<number, PIXI.Texture>;

  constructor(
    public baseTexture: PIXI.BaseTexture,
    private options: TilesetOptions
  ) {
    this.tileTextures = new Map();
  }

  getTile(tileID: number) {
    if (this.tileTextures.has(tileID)) {
      return this.tileTextures.get(tileID);
    }

    const texture = new PIXI.Texture(this.baseTexture, new PIXI.Rectangle(
      (tileID % this.options.columns) * this.options.grid.width,
      (Math.floor(tileID / this.options.columns)) * this.options.grid.height,
      this.options.grid.width,
      this.options.grid.height));
    this.tileTextures.set(tileID, texture);

    return texture;
  }
}
