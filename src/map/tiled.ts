// Types for Tiled's JSON map format, and `readMap`, which turns a map into what the game needs:
// a walk grid (which tiles block), the doors, NPCs, and signs, the street-name zones, and the start point.
// It reads only the JSON, so a map edited in Tiled works as long as the layer and property names stay the same.
import { isSideGameId, type SideGameId } from '../data/sideGames.ts';
import type { StopId } from '../data/stops.ts';
import { makeGrid, setBlocked, type Grid, type Tile } from '../logic/grid.ts';
import { isStopId } from '../state/progress.ts';

export interface TiledProperty {
    name: string;
    type: 'string' | 'bool' | 'int' | 'float';
    value: string | boolean | number;
}

export interface TiledObject {
    id: number;
    name: string;
    type: string;
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
    visible: boolean;
    properties?: TiledProperty[];
}

export interface TiledTileLayer {
    id: number;
    name: string;
    type: 'tilelayer';
    x: number;
    y: number;
    width: number;
    height: number;
    opacity: number;
    visible: boolean;
    data: number[];
}

export interface TiledObjectLayer {
    id: number;
    name: string;
    type: 'objectgroup';
    draworder: 'topdown';
    x: number;
    y: number;
    opacity: number;
    visible: boolean;
    objects: TiledObject[];
}

export type TiledLayer = TiledTileLayer | TiledObjectLayer;

export interface TiledTileset {
    firstgid: number;
    name: string;
    image: string;
    imagewidth: number;
    imageheight: number;
    tilewidth: number;
    tileheight: number;
    columns: number;
    tilecount: number;
    margin: number;
    spacing: number;
    tiles?: { id: number; properties?: TiledProperty[] }[];
}

export interface TiledMap {
    type: 'map';
    version: string;
    tiledversion: string;
    orientation: 'orthogonal';
    renderorder: 'right-down';
    infinite: boolean;
    compressionlevel: number;
    width: number;
    height: number;
    tilewidth: number;
    tileheight: number;
    nextlayerid: number;
    nextobjectid: number;
    tilesets: TiledTileset[];
    layers: TiledLayer[];
}

export type InteractableKind = 'door' | 'npc' | 'sign';

// Positions and sizes are in tiles.
export interface Interactable {
    kind: InteractableKind;
    col: number;
    row: number;
    width: number;
    height: number;
    stopId?: StopId;
    sideGameId?: SideGameId;
    dialogueId?: string;
    npc?: string;
    facing?: string;
}

export interface Zone {
    label: string;
    col: number;
    row: number;
    width: number;
    height: number;
}

// Positions and sizes are in pixels, because name boards do not line up with tiles.
export interface Nameplate {
    stopId: StopId;
    board: string;
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface MapInfo {
    width: number;
    height: number;
    tileSize: number;
    grid: Grid;
    interactables: Interactable[];
    zones: Zone[];
    nameplates: Nameplate[];
    spawn: Tile;
}

// These layers can block movement. Decor never blocks: it is drawn above the player.
const BLOCKING_LAYERS = ['ground', 'buildings'];

export function readMap(map: TiledMap): MapInfo {
    const tileSize = map.tilewidth;
    const blockingGids = blockingTileGids(map);
    const tileLayers = map.layers.filter(
        (layer): layer is TiledTileLayer => layer.type === 'tilelayer' && BLOCKING_LAYERS.includes(layer.name)
    );
    const grid = makeGrid(map.width, map.height, (col, row) =>
        tileLayers.some((layer) => blockingGids.has(layer.data[row * map.width + col]))
    );

    const interactables = objectsIn(map, 'interactables')
        .filter((object) => ['door', 'npc', 'sign'].includes(object.type))
        .map((object) => toInteractable(object, tileSize));

    for (const item of interactables.filter((entry) => entry.kind === 'npc')) {
        setBlocked(grid, item, true);
    }

    const spawnObject = objectsIn(map, 'interactables').find((object) => object.type === 'spawn');

    return {
        width: map.width,
        height: map.height,
        tileSize,
        grid,
        interactables,
        zones: objectsIn(map, 'zones').map((object) => ({ label: object.name, ...toTiles(object, tileSize) })),
        nameplates: objectsIn(map, 'labels').flatMap((object) => toNameplate(object)),
        spawn: spawnObject ? { col: spawnObject.x / tileSize, row: spawnObject.y / tileSize } : { col: 0, row: 0 }
    };
}

export function interactableAt(info: MapInfo, tile: Tile): Interactable | undefined {
    return info.interactables.find((item) => covers(item, tile));
}

export function zoneLabelAt(info: MapInfo, tile: Tile): string {
    return info.zones.find((zone) => covers(zone, tile))?.label ?? '';
}

export function propertyOf(object: TiledObject, name: string): string | boolean | number | undefined {
    return object.properties?.find((property) => property.name === name)?.value;
}

function covers(area: { col: number; row: number; width: number; height: number }, tile: Tile): boolean {
    return tile.col >= area.col && tile.col < area.col + area.width
        && tile.row >= area.row && tile.row < area.row + area.height;
}

function blockingTileGids(map: TiledMap): Set<number> {
    const gids = new Set<number>();

    for (const tileset of map.tilesets) {
        for (const tile of tileset.tiles ?? []) {
            if (tile.properties?.some((property) => property.name === 'blocks' && property.value === true)) {
                gids.add(tileset.firstgid + tile.id);
            }
        }
    }

    return gids;
}

function objectsIn(map: TiledMap, layerName: string): TiledObject[] {
    const layer = map.layers.find((entry) => entry.name === layerName);
    return layer?.type === 'objectgroup' ? layer.objects : [];
}

function toTiles(object: TiledObject, tileSize: number) {
    return {
        col: Math.floor(object.x / tileSize),
        row: Math.floor(object.y / tileSize),
        width: Math.max(1, Math.round(object.width / tileSize)),
        height: Math.max(1, Math.round(object.height / tileSize))
    };
}

function toInteractable(object: TiledObject, tileSize: number): Interactable {
    const stopId = propertyOf(object, 'stopId');
    const item: Interactable = { kind: object.type as InteractableKind, ...toTiles(object, tileSize) };

    if (isStopId(stopId)) {
        item.stopId = stopId;
    }
    const sideGameId = propertyOf(object, 'sideGameId');
    if (isSideGameId(sideGameId)) {
        item.sideGameId = sideGameId;
    }
    for (const key of ['dialogueId', 'npc', 'facing'] as const) {
        const value = propertyOf(object, key);
        if (typeof value === 'string') {
            item[key] = value;
        }
    }

    return item;
}

function toNameplate(object: TiledObject): Nameplate[] {
    const stopId = propertyOf(object, 'stopId');
    const board = propertyOf(object, 'board');

    if (!isStopId(stopId)) {
        return [];
    }

    return [{
        stopId,
        board: typeof board === 'string' ? board : 'ink',
        x: object.x,
        y: object.y,
        width: object.width,
        height: object.height
    }];
}
