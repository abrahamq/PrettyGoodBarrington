// Generates public/maps/downtown.json, the overworld map, in Tiled's JSON format.
// Run it with `npm run build:map`. It overwrites the file, so hand edits made in Tiled are lost.
// Phase 0: the map is a blank 60x24 field of grass. Phase 2 adds streets, buildings, and doors.
import { writeFileSync } from 'node:fs';

const MAP_WIDTH = 60;
const MAP_HEIGHT = 24;
const TILE_SIZE = 16;
const OUTPUT_PATH = 'public/maps/downtown.json';

// Tile ids in Tiled start at 1. 0 means "no tile here".
const TILES = {
    empty: 0,
    grass: 1
};

function tileLayer(id, name, fillTile) {
    return {
        id,
        name,
        type: 'tilelayer',
        x: 0,
        y: 0,
        width: MAP_WIDTH,
        height: MAP_HEIGHT,
        opacity: 1,
        visible: true,
        data: new Array(MAP_WIDTH * MAP_HEIGHT).fill(fillTile)
    };
}

function objectLayer(id, name) {
    return {
        id,
        name,
        type: 'objectgroup',
        draworder: 'topdown',
        x: 0,
        y: 0,
        opacity: 1,
        visible: true,
        objects: []
    };
}

function tileset() {
    return {
        firstgid: 1,
        name: 'tiles',
        image: '../assets/tiles.png',
        imagewidth: 8 * TILE_SIZE,
        imageheight: TILE_SIZE,
        tilewidth: TILE_SIZE,
        tileheight: TILE_SIZE,
        columns: 8,
        tilecount: 8,
        margin: 0,
        spacing: 0
    };
}

function buildMap() {
    const layers = [
        tileLayer(1, 'ground', TILES.grass),
        tileLayer(2, 'buildings', TILES.empty),
        tileLayer(3, 'decor', TILES.empty),
        objectLayer(4, 'interactables')
    ];

    return {
        type: 'map',
        version: '1.10',
        tiledversion: '1.11.2',
        orientation: 'orthogonal',
        renderorder: 'right-down',
        infinite: false,
        compressionlevel: -1,
        width: MAP_WIDTH,
        height: MAP_HEIGHT,
        tilewidth: TILE_SIZE,
        tileheight: TILE_SIZE,
        nextlayerid: layers.length + 1,
        nextobjectid: 1,
        tilesets: [tileset()],
        layers
    };
}

// Puts each tile-data array on one line, the way Tiled saves it, so git diffs stay short.
function collapseNumberArrays(json) {
    return json.replace(/\[\s*([\d,\s]+?)\s*\]/g, (match, numbers) => `[${numbers.replace(/\s+/g, '')}]`);
}

const json = collapseNumberArrays(JSON.stringify(buildMap(), null, 2));
writeFileSync(OUTPUT_PATH, `${json}\n`);
console.log(`Wrote ${OUTPUT_PATH} (${MAP_WIDTH}x${MAP_HEIGHT} tiles)`);
