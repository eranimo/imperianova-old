"use strict";
var _a, _b, _c, _d, _e, _f, _g, _h;
exports.__esModule = true;
exports.oddq_directions = exports.renderOrder = exports.indexOrder = exports.oppositeDirections = exports.adjacentDirections = exports.directionTitles = exports.directionShort = exports.Direction = exports.terrainTypeTitles = exports.terrainMinimapColors = exports.terrainColors = exports.terrainBackTransitions = exports.terrainTransitions = exports.terrainTypeMax = exports.terrainTypes = exports.TerrainType = void 0;
var TerrainType;
(function (TerrainType) {
    TerrainType[TerrainType["MAP_EDGE"] = 0] = "MAP_EDGE";
    TerrainType[TerrainType["OCEAN"] = 1] = "OCEAN";
    TerrainType[TerrainType["GRASSLAND"] = 2] = "GRASSLAND";
    TerrainType[TerrainType["FOREST"] = 3] = "FOREST";
    TerrainType[TerrainType["DESERT"] = 4] = "DESERT";
    TerrainType[TerrainType["TAIGA"] = 5] = "TAIGA";
    TerrainType[TerrainType["TUNDRA"] = 6] = "TUNDRA";
    TerrainType[TerrainType["GLACIAL"] = 7] = "GLACIAL";
    TerrainType[TerrainType["RIVER"] = 8] = "RIVER";
})(TerrainType = exports.TerrainType || (exports.TerrainType = {}));
exports.terrainTypes = [
    TerrainType.MAP_EDGE,
    TerrainType.OCEAN,
    TerrainType.GRASSLAND,
    TerrainType.FOREST,
    TerrainType.DESERT,
    TerrainType.TAIGA,
    TerrainType.TUNDRA,
    TerrainType.GLACIAL,
    TerrainType.RIVER,
];
exports.terrainTypeMax = 8;
// a map of center terrain types to edge terrain types
// representing which terrains have transitions
// center -> edge
exports.terrainTransitions = (_a = {},
    _a[TerrainType.GRASSLAND] = [TerrainType.RIVER, TerrainType.DESERT, TerrainType.FOREST, TerrainType.TAIGA],
    _a[TerrainType.OCEAN] = [TerrainType.DESERT, TerrainType.GRASSLAND, TerrainType.FOREST, TerrainType.TAIGA, TerrainType.TUNDRA, TerrainType.GLACIAL],
    _a[TerrainType.FOREST] = [TerrainType.RIVER, TerrainType.TAIGA],
    _a[TerrainType.DESERT] = [TerrainType.RIVER, TerrainType.FOREST],
    _a[TerrainType.TUNDRA] = [TerrainType.RIVER, TerrainType.GLACIAL, TerrainType.TAIGA],
    _a[TerrainType.TAIGA] = [TerrainType.RIVER, TerrainType.GLACIAL],
    _a[TerrainType.GLACIAL] = [TerrainType.RIVER],
    _a);
// edge -> center
exports.terrainBackTransitions = {};
for (var _i = 0, _j = Object.entries(exports.terrainTransitions); _i < _j.length; _i++) {
    var _k = _j[_i], terrainType_ = _k[0], terrainTypes_2 = _k[1];
    var terrainType = parseInt(terrainType_, 10);
    for (var _l = 0, terrainTypes_1 = terrainTypes_2; _l < terrainTypes_1.length; _l++) {
        var edgeTerrainType = terrainTypes_1[_l];
        if (exports.terrainBackTransitions[edgeTerrainType] === undefined) {
            exports.terrainBackTransitions[edgeTerrainType] = [terrainType];
        }
        else {
            exports.terrainBackTransitions[edgeTerrainType].push(terrainType);
        }
    }
}
exports.terrainColors = (_b = {},
    _b[TerrainType.MAP_EDGE] = 0x000000,
    _b[TerrainType.OCEAN] = 0x3F78CB,
    _b[TerrainType.GRASSLAND] = 0x81B446,
    _b[TerrainType.FOREST] = 0x236e29,
    _b[TerrainType.DESERT] = 0xD9BF8C,
    _b[TerrainType.TAIGA] = 0x006259,
    _b[TerrainType.TUNDRA] = 0x96D1C3,
    _b[TerrainType.GLACIAL] = 0xFAFAFA,
    _b[TerrainType.RIVER] = 0x6793d5,
    _b);
exports.terrainMinimapColors = (_c = {},
    _c[TerrainType.MAP_EDGE] = '#000000',
    _c[TerrainType.OCEAN] = '#3F78CB',
    _c[TerrainType.GRASSLAND] = '#81B446',
    _c[TerrainType.FOREST] = '#236e29',
    _c[TerrainType.DESERT] = '#D9BF8C',
    _c[TerrainType.TAIGA] = '#006259',
    _c[TerrainType.TUNDRA] = '#96D1C3',
    _c[TerrainType.GLACIAL] = '#FAFAFA',
    _c[TerrainType.RIVER] = '#6793d5',
    _c);
exports.terrainTypeTitles = (_d = {},
    _d[TerrainType.MAP_EDGE] = 'MAP EDGE',
    _d[TerrainType.OCEAN] = 'Ocean',
    _d[TerrainType.GRASSLAND] = 'Grassland',
    _d[TerrainType.FOREST] = 'Forest',
    _d[TerrainType.DESERT] = 'Desert',
    _d[TerrainType.TAIGA] = 'Taiga',
    _d[TerrainType.TUNDRA] = 'Tundra',
    _d[TerrainType.GLACIAL] = 'Glacial',
    _d[TerrainType.RIVER] = 'River',
    _d);
var Direction;
(function (Direction) {
    Direction[Direction["SE"] = 0] = "SE";
    Direction[Direction["NE"] = 1] = "NE";
    Direction[Direction["N"] = 2] = "N";
    Direction[Direction["NW"] = 3] = "NW";
    Direction[Direction["SW"] = 4] = "SW";
    Direction[Direction["S"] = 5] = "S";
})(Direction = exports.Direction || (exports.Direction = {}));
exports.directionShort = (_e = {},
    _e[Direction.SE] = 'SE',
    _e[Direction.NE] = 'NE',
    _e[Direction.N] = 'N',
    _e[Direction.NW] = 'NW',
    _e[Direction.SW] = 'SW',
    _e[Direction.S] = 'S',
    _e);
exports.directionTitles = (_f = {},
    _f[Direction.SE] = 'South East',
    _f[Direction.NE] = 'North East',
    _f[Direction.N] = 'North',
    _f[Direction.NW] = 'North West',
    _f[Direction.SW] = 'South West',
    _f[Direction.S] = 'South',
    _f);
exports.adjacentDirections = (_g = {},
    _g[Direction.SE] = [Direction.NE, Direction.S],
    _g[Direction.NE] = [Direction.N, Direction.SE],
    _g[Direction.N] = [Direction.NW, Direction.NE],
    _g[Direction.NW] = [Direction.SW, Direction.N],
    _g[Direction.SW] = [Direction.S, Direction.NW],
    _g[Direction.S] = [Direction.SE, Direction.SW],
    _g);
exports.oppositeDirections = (_h = {},
    _h[Direction.SE] = Direction.NW,
    _h[Direction.NE] = Direction.SW,
    _h[Direction.N] = Direction.S,
    _h[Direction.NW] = Direction.SE,
    _h[Direction.SW] = Direction.NE,
    _h[Direction.S] = Direction.N,
    _h);
exports.indexOrder = [
    Direction.SE,
    Direction.NE,
    Direction.N,
    Direction.NW,
    Direction.SW,
    Direction.S,
];
exports.renderOrder = [
    Direction.N,
    Direction.NW,
    Direction.NE,
    Direction.SW,
    Direction.SE,
    Direction.S,
];
exports.oddq_directions = [
    [
        [+1, 0], [+1, -1], [0, -1],
        [-1, -1], [-1, 0], [0, +1]
    ],
    [
        [+1, +1], [+1, 0], [0, -1],
        [-1, 0], [-1, +1], [0, +1]
    ],
];
