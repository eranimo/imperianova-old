# ImperiaNova

2D hex-based history generator

### Scripts

Tileset builder script:
```
./scripts/tilesetBuilder.ts <tilesetName> -d <tilesetDefPath> -i <tilesetImagePath> -o <outputPath>
```

- *tilesetName*: Filename of tileset
- *tilesetDefPath* - Path to the tileset .tsx/.xml Tiled tileset file
- *tilesetImagePath* - Path to tileset image
- *outputPath* - Output folder for tileset

will output 2 files: An image file named `<tilesetName>.tileset.png` and a tileset definition file named `<tilesetName>.tileset.json`.