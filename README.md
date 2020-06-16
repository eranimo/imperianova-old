# ImperiaNova

2D hex-based history generator

## Scripts

### Tileset generator
Builds a tileset based on settings (found in `scripts/autogenSettings.ts`) where tiles are sections of a flat-topped hexagon sized 32x32 with a 2px vertical offset.

File: **scripts/tilesetAutogen.ts**
Options:

  --help                 Show help                                     [boolean]
  --version              Show version number                           [boolean]
  --outputPath, -o       Output folder for tileset def  [string] [default: "./"]
  --outputExtension, -e  Output file extension         [string] [default: "xml"]
  --padding, -p          Padding in tileset image                  [default: 15]


Outputs 2 files: An image file named `<tilesetName>.tileset.png` and a tileset definition file named `<tilesetName>.tileset.json`.

### Sectional tileset merger (deprecated)
Merges sectional tilesets into a full hexagon tileset. This script is deprecated because this is done in the browser now.

File: **scripts/sectionalTilesetMerger.ts**
Options:

  --help                  Show help                                    [boolean]
  --version               Show version number                          [boolean]
  --tilesetDefPath, -d    Path to the tileset .tsx/.xml Tiled tileset file [string] [required]
  --tilesetImagePath, -i  Path to tileset image              [string] [required]
  --outputPath, -o        Output folder for tileset     [string] [default: "./"]
  --columns, -c           Number of columns in tileset    [number] [default: 25]
  --padding, -p           Padding in tileset image                 [default: 15]

Outputs 2 files: An image file named `<tilesetName>.tileset.png` and a tileset definition file named `<tilesetName>.tileset.json`.