// Lays out the downtown map (60x24 tiles) in Tiled's JSON format. `npm run build:map` saves it to
// public/maps/downtown.json. Stylized, not exact: Main Street runs east-west across rows 13-16,
// Railroad Street goes north from it at columns 30-33, Castle Street is a lane at the west end,
// Bridge Street goes south to the river, and the River Walk boardwalk runs along the water.
// At the east end, north of Main Street, Jack mows the town lawn next to the GB hedge.
// Positions below are (column, row) in tiles; row 0 is the top of the map.
import { JACK } from '../art/people.ts';
import { stopById, type StopId } from '../data/stops.ts';
import { TILE_SIZE } from '../layout.ts';
import type { TiledMap, TiledObject, TiledObjectLayer, TiledTileLayer } from './tiled.ts';
import { tileGid, tilesetForMap, type TileName } from './tileset.ts';

export const MAP_WIDTH = 60;
export const MAP_HEIGHT = 24;

type TileLayerName = 'ground' | 'buildings' | 'decor';
type ObjectLayerName = 'interactables' | 'zones' | 'labels';

class MapBuilder {
    private readonly tiles: Record<TileLayerName, number[]>;
    private readonly objects: Record<ObjectLayerName, TiledObject[]> = { interactables: [], zones: [], labels: [] };
    private nextObjectId = 1;

    constructor() {
        const empty = () => new Array(MAP_WIDTH * MAP_HEIGHT).fill(0);
        this.tiles = { ground: empty(), buildings: empty(), decor: empty() };
    }

    set(layer: TileLayerName, col: number, row: number, name: TileName): void {
        this.tiles[layer][row * MAP_WIDTH + col] = tileGid(name);
    }

    fill(layer: TileLayerName, col: number, row: number, width: number, height: number, name: TileName): void {
        for (let r = row; r < row + height; r++) {
            for (let c = col; c < col + width; c++) {
                this.set(layer, c, r, name);
            }
        }
    }

    addObject(
        layer: ObjectLayerName,
        type: string,
        name: string,
        area: { x: number; y: number; width: number; height: number },
        properties: Record<string, string> = {}
    ): void {
        const object: TiledObject = { id: this.nextObjectId++, name, type, ...area, rotation: 0, visible: true };
        const entries = Object.entries(properties);

        if (entries.length > 0) {
            object.properties = entries.map(([key, value]) => ({ name: key, type: 'string', value }));
        }
        this.objects[layer].push(object);
    }

    toTiled(): TiledMap {
        const tileLayerNames: TileLayerName[] = ['ground', 'buildings', 'decor'];
        const objectLayerNames: ObjectLayerName[] = ['interactables', 'zones', 'labels'];
        const tileLayers: TiledTileLayer[] = tileLayerNames.map((name, index) => ({
            id: index + 1, name, type: 'tilelayer', x: 0, y: 0,
            width: MAP_WIDTH, height: MAP_HEIGHT, opacity: 1, visible: true, data: this.tiles[name]
        }));
        const objectLayers: TiledObjectLayer[] = objectLayerNames.map((name, index) => ({
            id: tileLayers.length + index + 1, name, type: 'objectgroup', draworder: 'topdown',
            x: 0, y: 0, opacity: 1, visible: true, objects: this.objects[name]
        }));

        return {
            type: 'map', version: '1.10', tiledversion: '1.11.2', orientation: 'orthogonal', renderorder: 'right-down',
            infinite: false, compressionlevel: -1,
            width: MAP_WIDTH, height: MAP_HEIGHT, tilewidth: TILE_SIZE, tileheight: TILE_SIZE,
            nextlayerid: tileLayers.length + objectLayers.length + 1,
            nextobjectid: this.nextObjectId,
            tilesets: [tilesetForMap()],
            layers: [...tileLayers, ...objectLayers]
        };
    }
}

function tileArea(col: number, row: number, width = 1, height = 1) {
    return { x: col * TILE_SIZE, y: row * TILE_SIZE, width: width * TILE_SIZE, height: height * TILE_SIZE };
}

interface Building {
    col: number;
    row: number;
    width: number;
    // Includes the roof row.
    height: number;
    roof: TileName;
    wall: TileName;
}

function addBuilding(map: MapBuilder, building: Building): void {
    map.fill('buildings', building.col, building.row, building.width, 1, building.roof);
    map.fill('buildings', building.col, building.row + 1, building.width, building.height - 1, building.wall);
}

function addDecorRow(map: MapBuilder, row: number, cols: number[], tile: TileName): void {
    for (const col of cols) {
        map.set('decor', col, row, tile);
    }
}

// A door with its shopkeeper standing in it. The door faces south, so the player talks from the tile below.
function addStopDoor(map: MapBuilder, stopId: StopId, npc: string, col: number, row: number, width = 1): void {
    map.addObject('interactables', 'door', stopId, tileArea(col, row, width), { stopId, npc });
}

// The name board over a storefront. The game paints the board and the name from stops.ts.
function addNameplate(map: MapBuilder, stopId: StopId, board: string, building: Building, row: number): void {
    const width = stopById(stopId).sign.length * 8 + 8;
    const x = Math.round(building.col * TILE_SIZE + (building.width * TILE_SIZE - width) / 2);

    map.addObject('labels', 'nameplate', stopId, { x, y: row * TILE_SIZE + 2, width, height: 12 }, { stopId, board });
}

function addTree(map: MapBuilder, col: number, row: number): void {
    map.set('buildings', col, row, 'treeTrunk');
    map.set('decor', col, row - 1, 'treeCanopy');
}

function addLamp(map: MapBuilder, col: number, row: number): void {
    map.set('buildings', col, row, 'lampPost');
    map.set('decor', col, row - 1, 'lampHead');
}

function addSign(map: MapBuilder, dialogueId: string, col: number, row: number): void {
    map.set('buildings', col, row, 'streetSign');
    map.addObject('interactables', 'sign', dialogueId, tileArea(col, row), { dialogueId });
}

function addNpc(map: MapBuilder, npc: string, col: number, row: number, properties: Record<string, string>): void {
    map.addObject('interactables', 'npc', npc, tileArea(col, row), { npc, ...properties });
}

function layGround(map: MapBuilder): void {
    map.fill('ground', 0, 0, MAP_WIDTH, MAP_HEIGHT, 'grass');

    for (let row = 0; row < MAP_HEIGHT; row++) {
        for (let col = 0; col < MAP_WIDTH; col++) {
            if ((col * 7 + row * 13) % 17 === 0) {
                map.set('ground', col, row, 'grassFlowers');
            }
        }
    }

    // Main Street
    map.fill('ground', 0, 13, MAP_WIDTH, 1, 'paverCurbSouth');
    map.fill('ground', 0, 14, MAP_WIDTH, 1, 'roadLine');
    map.fill('ground', 0, 15, MAP_WIDTH, 1, 'road');
    map.fill('ground', 0, 16, MAP_WIDTH, 1, 'paverCurbNorth');

    // Railroad Street, with a crosswalk over Main Street
    map.fill('ground', 30, 0, 1, 13, 'paverCurbEast');
    map.fill('ground', 31, 0, 2, 14, 'road');
    map.fill('ground', 33, 0, 1, 13, 'paverCurbWest');
    map.set('ground', 30, 13, 'paverCurbSouthEast');
    map.set('ground', 33, 13, 'paverCurbSouthWest');
    map.fill('ground', 31, 14, 1, 2, 'crosswalkWest');
    map.fill('ground', 32, 14, 1, 2, 'crosswalkEast');

    // Castle Street lane, forecourts, and the park path down to the river
    map.fill('ground', 11, 0, 2, 13, 'paver');
    map.fill('ground', 22, 6, 8, 1, 'paver');
    map.fill('ground', 34, 6, 7, 1, 'paver');
    map.fill('ground', 24, 17, 1, 3, 'paver');

    // Bridge Street, down to a bridge over the river
    map.set('ground', 47, 16, 'paverCurbNorthEast');
    map.set('ground', 50, 16, 'paverCurbNorthWest');
    map.fill('ground', 48, 16, 2, 5, 'road');
    map.fill('ground', 47, 17, 1, 4, 'paverCurbEast');
    map.fill('ground', 50, 17, 1, 4, 'paverCurbWest');

    // River Walk boardwalk, the Housatonic, the bridge, and the ranger's pier
    map.fill('ground', 0, 20, 47, 1, 'boardwalk');
    map.fill('ground', 51, 20, 9, 1, 'boardwalk');
    map.fill('ground', 0, 21, MAP_WIDTH, 1, 'waterBank');
    map.fill('ground', 0, 22, MAP_WIDTH, 2, 'water');
    map.fill('ground', 47, 21, 4, 3, 'boardwalk');
    map.set('ground', 20, 21, 'boardwalk');
}

function layBuildings(map: MapBuilder): void {
    const mahaiwe: Building = { col: 2, row: 8, width: 9, height: 5, roof: 'roofPurple', wall: 'wallCream' };
    addBuilding(map, mahaiwe);
    addDecorRow(map, 10, [3, 5, 7, 9], 'window');
    addDecorRow(map, 11, [4, 5, 6, 7, 8], 'awningRed');
    addDecorRow(map, 12, [3, 9], 'windowLit');
    addDecorRow(map, 12, [5, 6, 7], 'doorGlass');
    addStopDoor(map, 'mahaiwe', 'npc-usher', 5, 12, 3);
    addNameplate(map, 'mahaiwe', 'red', mahaiwe, 9);

    const townHall: Building = { col: 13, row: 8, width: 7, height: 5, roof: 'roofSlate', wall: 'wallWhite' };
    addBuilding(map, townHall);
    addDecorRow(map, 10, [14, 15, 17, 18], 'window');
    addDecorRow(map, 11, [14, 18], 'window');
    addDecorRow(map, 12, [14, 18], 'window');
    map.set('decor', 16, 12, 'door');
    addStopDoor(map, 'townhall', 'npc-clerk', 16, 12);
    addNameplate(map, 'townhall', 'ink', townHall, 9);

    const baba: Building = { col: 22, row: 9, width: 7, height: 4, roof: 'roofRed', wall: 'wallBrick' };
    addBuilding(map, baba);
    addDecorRow(map, 11, [22, 23, 24, 25, 26, 27, 28], 'awningRed');
    addDecorRow(map, 12, [23, 24], 'windowLit');
    addDecorRow(map, 12, [28], 'window');
    map.set('decor', 26, 12, 'door');
    addStopDoor(map, 'baba', 'npc-pizzaiolo', 26, 12);
    addNameplate(map, 'baba', 'ink', baba, 10);

    const triplex: Building = { col: 22, row: 1, width: 7, height: 5, roof: 'roofSlate', wall: 'wallNavy' };
    addBuilding(map, triplex);
    addDecorRow(map, 3, [23, 27], 'windowLit');
    addDecorRow(map, 3, [25], 'window');
    addDecorRow(map, 4, [23, 24, 25, 26, 27], 'awningRed');
    addDecorRow(map, 5, [22, 28], 'window');
    addDecorRow(map, 5, [24, 25, 26], 'doorGlass');
    addStopDoor(map, 'triplex', 'npc-projectionist', 24, 5, 3);
    addNameplate(map, 'triplex', 'red', triplex, 2);

    const soco: Building = { col: 35, row: 2, width: 6, height: 4, roof: 'roofTeal', wall: 'wallPink' };
    addBuilding(map, soco);
    addDecorRow(map, 4, [35, 36, 37, 38, 39, 40], 'awningMint');
    addDecorRow(map, 5, [36], 'windowLit');
    addDecorRow(map, 5, [40], 'window');
    map.set('decor', 38, 5, 'door');
    map.set('buildings', 41, 6, 'sandwichBoard');
    addStopDoor(map, 'soco', 'npc-scooper', 38, 5);
    addNameplate(map, 'soco', 'cream', soco, 3);

    const gbEats: Building = { col: 36, row: 9, width: 7, height: 4, roof: 'roofPurple', wall: 'wallMustard' };
    addBuilding(map, gbEats);
    addDecorRow(map, 11, [36, 37, 38, 39, 40, 41, 42], 'awningRed');
    addDecorRow(map, 12, [37, 38], 'windowLit');
    addDecorRow(map, 12, [42], 'window');
    map.set('decor', 40, 12, 'door');
    addStopDoor(map, 'gbeats', 'npc-grillcook', 40, 12);
    addNameplate(map, 'gbeats', 'ink', gbEats, 10);

    const coop: Building = { col: 51, row: 17, width: 7, height: 3, roof: 'roofGreen', wall: 'wallSage' };
    addBuilding(map, coop);
    addDecorRow(map, 19, [52, 53], 'windowLit');
    addDecorRow(map, 19, [57], 'window');
    map.set('decor', 55, 19, 'door');
    addStopDoor(map, 'coop', 'npc-grocer', 55, 19);
    addNameplate(map, 'coop', 'cream', coop, 18);
}

function layStreetLife(map: MapBuilder): void {
    const trees = [
        [1, 6], [4, 3], [8, 2], [9, 6], [14, 4], [17, 6], [20, 3], [0, 12],
        [44, 4], [47, 7], [50, 2], [53, 6], [56, 3], [46, 12], [50, 11],
        [2, 19], [6, 18], [10, 19], [14, 18], [18, 19], [28, 19], [32, 18], [36, 19], [40, 18], [44, 19]
    ];
    for (const [col, row] of trees) {
        addTree(map, col, row);
    }

    addLamp(map, 20, 12);
    addLamp(map, 34, 12);
    addLamp(map, 43, 12);

    map.set('buildings', 6, 15, 'carLeft');
    map.set('buildings', 7, 15, 'carRight');

    addSign(map, 'sign-railroad', 29, 12);
    addSign(map, 'sign-river', 23, 19);
    addSign(map, 'sign-bridge', 46, 17);

    addNpc(map, 'npc-ranger', 20, 21, { stopId: 'riverwalk' });
    addNpc(map, 'npc-local', 37, 16, { dialogueId: 'local', facing: 'up' });
    addNpc(map, 'npc-dog', 27, 16, { dialogueId: 'dog' });

    map.addObject('interactables', 'spawn', 'start', tileArea(28, 13));

    layJacksLawn(map);
}

// Mowed stripes, the GB hedge with the flagpole between its letters, and Jack at the far east edge with his mower.
function layJacksLawn(map: MapBuilder): void {
    for (const row of [8, 10, 12]) {
        map.fill('ground', 51, row, MAP_WIDTH - 51, 1, 'grassMowed');
    }

    map.set('buildings', 54, 11, 'hedgeG');
    map.set('buildings', 55, 11, 'hedgeB');
    map.set('buildings', 55, 10, 'flagPole');
    map.set('decor', 55, 9, 'flagTop');
    map.addObject('interactables', 'sign', 'gb-hedge', tileArea(54, 11, 2, 1), { dialogueId: 'gb-hedge' });

    addNpc(map, JACK.key, 58, 11, { sideGameId: 'hedgeTrim' });
}

// Checked in order: the first zone that contains the player names the street. MAIN ST catches the rest.
function layZones(map: MapBuilder): void {
    map.addObject('zones', 'zone', 'RAILROAD ST', tileArea(20, 0, 24, 13));
    map.addObject('zones', 'zone', 'CASTLE ST', tileArea(0, 0, 13, 13));
    map.addObject('zones', 'zone', 'BRIDGE ST', tileArea(46, 17, 14, 7));
    map.addObject('zones', 'zone', 'RIVER WALK', tileArea(0, 20, MAP_WIDTH, 4));
    map.addObject('zones', 'zone', 'MAIN ST', tileArea(0, 0, MAP_WIDTH, MAP_HEIGHT));
}

export function buildDowntownMap(): TiledMap {
    const map = new MapBuilder();

    layGround(map);
    layBuildings(map);
    layStreetLife(map);
    layZones(map);

    return map.toTiled();
}
