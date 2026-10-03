// The overworld tileset: every 16x16 tile, drawn with the patterns from docs/mocks/Overworld.dc.html.
// The game paints it into the "tiles" texture at startup, and `npm run build:map` saves the same art
// as public/maps/tiles.png, so Tiled shows exactly what the game shows.
// Tiles in the `buildings` layer draw on a clear background over the ground; `decor` tiles draw above the player.
// A tile's position in TILE_ART is its id: Tiled numbers tiles from 1 (0 means "no tile").
import type { Layer, Offset, PixelTarget } from '../art/paint.ts';
import { MAP_HEDGE, MAP_HEDGE_POLE_X, mapHedgeLayers } from '../art/hedge.ts';
import { drawLayers } from '../art/paint.ts';
import { rectPath } from '../art/svgPath.ts';
import type { TiledTileset } from './tiled.ts';

export interface TileArt {
    blocks: boolean;
    layers: Layer[];
}

export const TILESET_NAME = 'tiles';
export const TILESET_COLUMNS = 8;
const SIZE = 16;

const FULL = rectPath(0, 0, SIZE, SIZE);
const EVERY_8: Offset[] = [[0, 0], [8, 0], [0, 8], [8, 8]];
const EVERY_8_BY_4: Offset[] = [[0, 0], [8, 0], [0, 4], [8, 4], [0, 8], [8, 8], [0, 12], [8, 12]];
const JOINTS = 'M0 3h8v1h-8z M0 7h8v1h-8z M3 0h1v3h-1z M7 4h1v3h-1z';
const SIDING = 'M0 3h16v1h-16z M0 7h16v1h-16z M0 11h16v1h-16z M0 15h16v1h-16z';

const GRASS: Layer[] = [
    { color: 'grass', path: FULL },
    { color: 'grassDark', path: 'M3 4h1v2h-1z M4 3h1v1h-1z M11 10h1v2h-1z M12 9h1v1h-1z M7 13h1v1h-1z' },
    { color: 'grassLight', path: 'M8 1h2v1h-2z M1 11h2v1h-2z M13 5h1v1h-1z' }
];
const PAVER: Layer[] = [
    { color: 'paver', path: FULL },
    { color: 'paverJoint', path: JOINTS, at: EVERY_8 }
];
const ROAD: Layer[] = [
    { color: 'road', path: FULL },
    { color: 'asphaltSpeck', path: 'M1 2h1v1h-1z M5 6h1v1h-1z M6 1h1v1h-1z', at: EVERY_8 }
];
const WATER: Layer[] = [
    { color: 'sky', path: FULL },
    { color: 'waterLight', path: 'M2 4h4v1h-4z M10 11h4v1h-4z M11 3h2v1h-2z M3 12h2v1h-2z' },
    { color: 'waterDeep', path: 'M7 7h3v1h-3z M13 14h2v1h-2z' }
];
const CURB = {
    north: { color: 'curbStone', path: 'M0 0h16v1h-16z' },
    south: { color: 'curbStone', path: 'M0 15h16v1h-16z' },
    east: { color: 'curbStone', path: 'M15 0h1v16h-1z' },
    west: { color: 'curbStone', path: 'M0 0h1v16h-1z' }
} satisfies Record<string, Layer>;

// The parked car from the mockup is 24x14, so it spans two tiles; each half clips to its own tile.
const CAR: Layer[] = [
    { color: 'ink', path: 'M1 1h22v12h-22z' },
    { color: 'carBlue', path: 'M2 2h20v10h-20z' },
    { color: 'glassLight', path: 'M14 3h4v8h-4z M5 3h3v8h-3z' },
    { color: 'carBlueDark', path: 'M9 3h5v8h-5z' },
    { color: 'ink', path: 'M3 0h4v1h-4z M16 0h4v1h-4z M3 13h4v1h-4z M16 13h4v1h-4z' },
    { color: 'gold', path: 'M22 3h1v2h-1z M22 9h1v2h-1z' }
];

function shiftedTo(layers: Layer[], offset: Offset): Layer[] {
    return layers.map((layer) => ({ ...layer, at: [offset] }));
}

// The GB hedge is 6x3 tiles, each a 16x16 piece of one picture, named by column and row: hedge0x0 to hedge5x2.
export const HEDGE_COLUMNS = MAP_HEDGE.width / SIZE;
export const HEDGE_ROWS = MAP_HEDGE.height / SIZE;
type HedgeTileName = `hedge${0 | 1 | 2 | 3 | 4 | 5}x${0 | 1 | 2}`;

export function hedgeTileName(col: number, row: number): HedgeTileName {
    return `hedge${col}x${row}` as HedgeTileName;
}

function hedgeTiles(): Record<HedgeTileName, TileArt> {
    const layers = mapHedgeLayers();
    const tiles = {} as Record<HedgeTileName, TileArt>;

    for (let row = 0; row < HEDGE_ROWS; row++) {
        for (let col = 0; col < HEDGE_COLUMNS; col++) {
            tiles[hedgeTileName(col, row)] = { blocks: true, layers: shiftedTo(layers, [-col * SIZE, -row * SIZE]) };
        }
    }

    return tiles;
}

// The flagpole and flag stand MAP_HEDGE_POLE_X pixels into the hedge, between the letters.
const POLE = MAP_HEDGE_POLE_X % SIZE;

function roof(shingle: Layer['color'], line: Layer['color'], edge: Layer['color']): TileArt {
    return {
        blocks: true,
        layers: [
            { color: shingle, path: FULL },
            { color: line, path: 'M0 3h8v1h-8z M4 0h1v3h-1z', at: EVERY_8_BY_4 },
            { color: edge, path: 'M0 0h16v2h-16z M0 14h16v2h-16z' }
        ]
    };
}

function wall(face: Layer['color'], detail?: Layer): TileArt {
    return { blocks: true, layers: detail ? [{ color: face, path: FULL }, detail] : [{ color: face, path: FULL }] };
}

function awning(stripe: Layer['color'], between: Layer['color']): TileArt {
    return {
        blocks: false,
        layers: [
            { color: stripe, path: 'M0 9h4v6h-4z M8 9h4v6h-4z M0 15h4v1h-4z M8 15h4v1h-4z' },
            { color: between, path: 'M4 9h4v6h-4z M12 9h4v6h-4z' }
        ]
    };
}

function windowTile(glass: Layer['color'], shine: Layer['color']): TileArt {
    return {
        blocks: false,
        layers: [
            { color: 'ink', path: 'M2 2h12v11h-12z' },
            { color: glass, path: 'M3 3h10v9h-10z' },
            { color: 'ink', path: 'M7 3h2v9h-2z' },
            { color: shine, path: 'M4 4h1v4h-1z M10 4h1v4h-1z' },
            { color: 'wood', path: 'M1 13h14v1h-14z' }
        ]
    };
}

export const TILE_ART = {
    // Ground
    grass: { blocks: false, layers: GRASS },
    grassFlowers: {
        blocks: false,
        layers: [
            ...GRASS,
            { color: 'pink', path: 'M4 6h1v1h-1z M12 3h1v1h-1z' },
            { color: 'gold', path: 'M10 12h1v1h-1z M2 13h1v1h-1z' },
            { color: 'whiteCream', path: 'M6 10h1v1h-1z' }
        ]
    },
    paver: { blocks: false, layers: PAVER },
    paverCurbSouth: { blocks: false, layers: [...PAVER, CURB.south] },
    paverCurbNorth: { blocks: false, layers: [...PAVER, CURB.north] },
    paverCurbEast: { blocks: false, layers: [...PAVER, CURB.east] },
    paverCurbWest: { blocks: false, layers: [...PAVER, CURB.west] },
    paverCurbSouthEast: { blocks: false, layers: [...PAVER, CURB.south, CURB.east] },
    paverCurbSouthWest: { blocks: false, layers: [...PAVER, CURB.south, CURB.west] },
    paverCurbNorthEast: { blocks: false, layers: [...PAVER, CURB.north, CURB.east] },
    paverCurbNorthWest: { blocks: false, layers: [...PAVER, CURB.north, CURB.west] },
    road: { blocks: false, layers: ROAD },
    roadLine: { blocks: false, layers: [...ROAD, { color: 'laneLine', path: 'M4 14h8v2h-8z' }] },
    crosswalkWest: { blocks: false, layers: [...ROAD, { color: 'cream', path: 'M2 2h14v3h-14z M2 10h14v3h-14z' }] },
    crosswalkEast: { blocks: false, layers: [...ROAD, { color: 'cream', path: 'M0 2h14v3h-14z M0 10h14v3h-14z' }] },
    water: { blocks: true, layers: WATER },
    waterBank: {
        blocks: true,
        layers: [...WATER, { color: 'wood', path: 'M0 0h16v1h-16z' }, { color: 'waterLight', path: 'M0 1h16v1h-16z' }]
    },
    boardwalk: {
        blocks: false,
        layers: [
            { color: 'plank', path: FULL },
            { color: 'wood', path: SIDING },
            { color: 'wood', path: 'M5 0h1v3h-1z M12 4h1v3h-1z M3 8h1v3h-1z M10 12h1v3h-1z' }
        ]
    },

    // Buildings (clear background, blocks movement)
    roofPurple: roof('shinglePurple', 'shinglePurpleLine', 'skyline'),
    roofRed: roof('shingleRed', 'shingleRedLine', 'roofRedEdge'),
    roofTeal: roof('shingleTeal', 'shingleTealLine', 'roofTealEdge'),
    roofGreen: roof('shingleGreen', 'shingleGreenLine', 'lawn'),
    roofSlate: roof('road', 'asphaltSpeck', 'skyline'),
    wallCream: wall('facadeCream'),
    wallBrick: wall('brick', { color: 'brickMortar', path: JOINTS, at: EVERY_8 }),
    wallPink: wall('facadePink'),
    wallWhite: wall('cream', { color: 'parchment', path: SIDING }),
    wallSage: wall('facadeSage', { color: 'facadeSageLine', path: SIDING }),
    wallNavy: wall('facadeNavy', { color: 'facadeNavyLine', path: 'M3 0h1v16h-1z M11 0h1v16h-1z' }),
    wallMustard: wall('facadeMustard', { color: 'facadeMustardLine', path: SIDING }),
    treeTrunk: {
        blocks: true,
        layers: [
            { color: 'leaf', path: 'M2 0h12v3h-12z M4 3h8v1h-8z' },
            { color: 'leafDark', path: 'M2 2h12v1h-12z' },
            { color: 'bark', path: 'M6 4h4v9h-4z' },
            { color: 'grassDark', path: 'M3 13h10v2h-10z' }
        ]
    },
    lampPost: { blocks: true, layers: [{ color: 'ink', path: 'M7 0h2v13h-2z M5 13h6v2h-6z' }] },
    carLeft: { blocks: true, layers: shiftedTo(CAR, [4, 1]) },
    carRight: { blocks: true, layers: shiftedTo(CAR, [-12, 1]) },
    streetSign: {
        blocks: true,
        layers: [
            { color: 'ink', path: 'M7 5h2v11h-2z' },
            { color: 'signGreen', path: 'M1 0h14v6h-14z' },
            { color: 'cream', path: 'M3 2h10v1h-10z M3 4h6v1h-6z' }
        ]
    },
    planter: {
        blocks: true,
        layers: [
            { color: 'leaf', path: 'M2 5h12v4h-12z' },
            { color: 'leafLight', path: 'M4 5h3v2h-3z' },
            { color: 'wood', path: 'M3 9h10v6h-10z' },
            { color: 'bark', path: 'M3 14h10v1h-10z' }
        ]
    },
    sandwichBoard: {
        blocks: true,
        layers: [
            { color: 'ink', path: 'M4 4h8v11h-8z' },
            { color: 'pink', path: 'M6 6h4v3h-4z' },
            { color: 'ochre', path: 'M6 9h4v1h-4z M7 10h2v2h-2z' }
        ]
    },

    // Decor (clear background, drawn above the player, never blocks)
    treeCanopy: {
        blocks: false,
        layers: [
            { color: 'leaf', path: 'M5 2h6v1h-6z M3 3h10v2h-10z M2 5h12v11h-12z' },
            { color: 'leafLight', path: 'M5 4h4v2h-4z M4 6h2v3h-2z' },
            { color: 'leafDark', path: 'M10 11h3v3h-3z M3 14h4v2h-4z' }
        ]
    },
    lampHead: {
        blocks: false,
        layers: [
            { color: 'ink', path: 'M4 9h8v4h-8z M7 13h2v3h-2z' },
            { color: 'gold', path: 'M5 10h6v2h-6z' }
        ]
    },
    window: windowTile('sky', 'glassShine'),
    windowLit: windowTile('gold', 'whiteCream'),
    door: {
        blocks: false,
        layers: [
            { color: 'ink', path: 'M2 1h12v15h-12z' },
            { color: 'bark', path: 'M3 2h10v14h-10z' },
            { color: 'gold', path: 'M5 4h6v4h-6z' },
            { color: 'amber', path: 'M11 10h1v1h-1z' }
        ]
    },
    doorGlass: {
        blocks: false,
        layers: [
            { color: 'ink', path: 'M1 1h14v15h-14z' },
            { color: 'sky', path: 'M2 2h5v14h-5z M9 2h5v14h-5z' },
            { color: 'glassShine', path: 'M3 4h1v5h-1z M10 4h1v5h-1z' },
            { color: 'amber', path: 'M6 9h1v2h-1z M9 9h1v2h-1z' }
        ]
    },
    awningRed: awning('awning', 'cream'),
    awningMint: awning('mint', 'whiteCream'),

    // Jack's lawn. These come last, so the tiles above keep their ids.
    grassMowed: {
        blocks: false,
        layers: [
            { color: 'lawnMowed', path: FULL },
            { color: 'grass', path: 'M2 5h1v1h-1z M9 11h1v1h-1z M13 2h1v1h-1z' },
            { color: 'grassLight', path: 'M6 8h2v1h-2z M12 13h1v1h-1z' }
        ]
    },
    // The flagpole rises from behind the hedge, between the G and the B.
    flagPole: {
        blocks: true,
        layers: [
            { color: 'whiteCream', path: rectPath(POLE, 0, 1, SIZE) },
            { color: 'steel', path: rectPath(POLE + 1, 0, 1, SIZE) }
        ]
    },
    flagTop: {
        blocks: false,
        layers: [
            { color: 'gold', path: rectPath(POLE, 0, 2, 2) },
            { color: 'whiteCream', path: `${rectPath(POLE, 2, 1, 14)} ${[4, 6, 8].map((y) => rectPath(POLE + 2, y, 8, 1)).join(' ')}` },
            { color: 'steel', path: rectPath(POLE + 1, 2, 1, 14) },
            { color: 'red', path: [3, 5, 7, 9].map((y) => rectPath(POLE + 2, y, 8, 1)).join(' ') },
            { color: 'facadeNavy', path: rectPath(POLE + 2, 3, 4, 4) },
            { color: 'whiteCream', path: `${rectPath(POLE + 3, 4, 1, 1)} ${rectPath(POLE + 5, 4, 1, 1)} ${rectPath(POLE + 4, 5, 1, 1)}` }
        ]
    },
    ...hedgeTiles()
} satisfies Record<string, TileArt>;

export type TileName = keyof typeof TILE_ART;

export const TILE_NAMES = Object.keys(TILE_ART) as TileName[];
export const TILESET_WIDTH = TILESET_COLUMNS * SIZE;
export const TILESET_HEIGHT = Math.ceil(TILE_NAMES.length / TILESET_COLUMNS) * SIZE;

export function tileGid(name: TileName): number {
    return TILE_NAMES.indexOf(name) + 1;
}

export function drawTileset(target: PixelTarget): void {
    TILE_NAMES.forEach((name, index) => {
        drawLayers(target, TILE_ART[name].layers, {
            x: (index % TILESET_COLUMNS) * SIZE,
            y: Math.floor(index / TILESET_COLUMNS) * SIZE,
            width: SIZE,
            height: SIZE
        });
    });
}

export function tilesetForMap(): TiledTileset & { tiles: NonNullable<TiledTileset['tiles']> } {
    return {
        firstgid: 1,
        name: TILESET_NAME,
        image: 'tiles.png',
        imagewidth: TILESET_WIDTH,
        imageheight: TILESET_HEIGHT,
        tilewidth: SIZE,
        tileheight: SIZE,
        columns: TILESET_COLUMNS,
        tilecount: TILE_NAMES.length,
        margin: 0,
        spacing: 0,
        tiles: TILE_NAMES.map((name, id) => ({
            id,
            properties: [{ name: 'blocks', type: 'bool', value: TILE_ART[name].blocks }]
        }))
    };
}
