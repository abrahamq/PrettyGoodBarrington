// Art for Trim the GB: the lawn backdrop (treeline, flagpole, mowed stripes, mulch bed), the clippers,
// and the hedge itself, which is painted pixel by pixel because it changes as the player trims it.
// Also the neat GB hedge on the overworld map, made from the same letter shapes.
//
// Every hedge pixel belongs to its nearest guide point on the letters' edges (src/logic/hedgeTrim.ts). While that
// point is untrimmed,
// the pixel is drawn shaggy: mottled leaves that spill past the letter's edge in uneven clumps. Once it is
// trimmed, the pixel is drawn neat: a flat boxwood face with a light top edge, a dark bottom edge, and a shadow below.
import { GUIDE_POINTS, HEDGE_AREA, HEDGE_TRIM, MIDDLE_DISTANCES, spacedOut, type Point } from '../logic/hedgeTrim.ts';
import { colorNumber, type ColorName } from '../palette.ts';
import type { Layer } from './paint.ts';
import { rectPath } from './svgPath.ts';

const WIDTH = 240;
const HEIGHT = 160;
// How far the shaggy leaves can reach past the hedge's edge.
const OVERGROWTH = 7;
// The dots that show where to trim, about 5 pixels apart around the edges.
const GUIDE_DOT_SPACING = 5;

const MULCH = { x: 40, y: 48, width: 160, height: 104 };
const POLE_X = 128;

let nearestGuides: Int16Array | null = null;
let guideDots: number[] | null = null;

// For each pixel in HEDGE_AREA, the index of its nearest guide point. Measured once, the first time it is needed.
function nearestGuide(): Int16Array {
    if (nearestGuides) {
        return nearestGuides;
    }

    const nearest = new Int16Array(HEDGE_AREA.width * HEDGE_AREA.height);
    for (let row = 0; row < HEDGE_AREA.height; row++) {
        for (let col = 0; col < HEDGE_AREA.width; col++) {
            const x = HEDGE_AREA.x + col + 0.5;
            const y = HEDGE_AREA.y + row + 0.5;
            let best = Infinity;

            GUIDE_POINTS.forEach((point, i) => {
                const d = (point.x - x) ** 2 + (point.y - y) ** 2;
                if (d < best) {
                    best = d;
                    nearest[row * HEDGE_AREA.width + col] = i;
                }
            });
        }
    }

    nearestGuides = nearest;
    return nearest;
}

function dotIndexes(): number[] {
    if (!guideDots) {
        const dots = new Set<Point>(spacedOut(GUIDE_POINTS, GUIDE_DOT_SPACING));
        guideDots = GUIDE_POINTS.flatMap((point, i) => (dots.has(point) ? [i] : []));
    }

    return guideDots;
}

// Distance from a pixel's center to the letters' middle lines; Infinity outside HEDGE_AREA.
function distanceAt(x: number, y: number): number {
    const col = x - HEDGE_AREA.x;
    const row = y - HEDGE_AREA.y;

    if (col < 0 || row < 0 || col >= HEDGE_AREA.width || row >= HEDGE_AREA.height) {
        return Infinity;
    }

    return MIDDLE_DISTANCES[row * HEDGE_AREA.width + col];
}

// Paints the hedge into a 240x160 RGBA pixel array (for example, a canvas's ImageData). Everything else is clear.
export function paintHedge(pixels: Uint8ClampedArray, trimmed: readonly boolean[]): void {
    const nearest = nearestGuide();
    const radius = HEDGE_TRIM.hedgeRadius;

    pixels.fill(0);

    for (let row = 0; row < HEDGE_AREA.height; row++) {
        for (let col = 0; col < HEDGE_AREA.width; col++) {
            const x = HEDGE_AREA.x + col;
            const y = HEDGE_AREA.y + row;
            const index = row * HEDGE_AREA.width + col;
            const d = MIDDLE_DISTANCES[index];
            const color = trimmed[nearest[index]] ? neatPixel(x, y, d, radius) : shaggyPixel(x, y, d, radius);

            if (color) {
                setPixel(pixels, x, y, color.name, color.alpha);
            }
        }
    }

    for (const i of dotIndexes()) {
        if (!trimmed[i]) {
            setPixel(pixels, Math.floor(GUIDE_POINTS[i].x), Math.floor(GUIDE_POINTS[i].y), 'whiteCream', 0.85);
        }
    }
}

interface PixelColor {
    name: ColorName;
    alpha: number;
}

function neatPixel(x: number, y: number, d: number, radius: number): PixelColor | null {
    if (d <= radius) {
        if (distanceAt(x, y - 1) > radius) {
            return { name: 'leafLight', alpha: 1 };
        }
        if (distanceAt(x, y + 1) > radius || distanceAt(x - 1, y) > radius || distanceAt(x + 1, y) > radius) {
            return { name: 'leafDark', alpha: 1 };
        }
        // A few small highlights, so the face reads as leaves and not paint.
        return { name: noise(x, y, 1) < 0.1 ? 'leafLight' : 'leaf', alpha: 1 };
    }

    // A soft shadow on the mulch just below the hedge.
    if (d <= radius + 2 && distanceAt(x, y - 2) <= radius) {
        return { name: 'ink', alpha: 0.3 };
    }

    return null;
}

function shaggyPixel(x: number, y: number, d: number, radius: number): PixelColor | null {
    // Squaring the clumps keeps most of the edge close in, with a few big clumps, so the letters still read.
    const reach = radius + 1 + OVERGROWTH * clumps(x, y) ** 2;
    const n = noise(x, y, 2);

    if (d <= reach) {
        return { name: n < 0.22 ? 'leafLight' : n > 0.72 ? 'leafDark' : 'leaf', alpha: 1 };
    }
    // Stray leaves past the clumps.
    if (d <= radius + OVERGROWTH && n < 0.06) {
        return { name: 'leafLight', alpha: 1 };
    }

    return null;
}

function setPixel(pixels: Uint8ClampedArray, x: number, y: number, name: ColorName, alpha: number): void {
    const color = colorNumber(name);
    const i = (y * WIDTH + x) * 4;

    pixels[i] = (color >> 16) & 0xff;
    pixels[i + 1] = (color >> 8) & 0xff;
    pixels[i + 2] = color & 0xff;
    pixels[i + 3] = Math.round(alpha * 255);
}

// A repeatable random number from 0 to 1 for each pixel.
function noise(x: number, y: number, seed: number): number {
    let h = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(seed, 1442695041);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// Smooth random bumps about 4 pixels across, from 0 to 1, so the overgrowth comes in clumps.
function clumps(x: number, y: number): number {
    const cell = 4;
    const cx = Math.floor(x / cell);
    const cy = Math.floor(y / cell);
    const fx = smooth(x / cell - cx);
    const fy = smooth(y / cell - cy);
    const top = noise(cx, cy, 3) * (1 - fx) + noise(cx + 1, cy, 3) * fx;
    const bottom = noise(cx, cy + 1, 3) * (1 - fx) + noise(cx + 1, cy + 1, 3) * fx;

    return top * (1 - fy) + bottom * fy;
}

function smooth(t: number): number {
    return t * t * (3 - 2 * t);
}

// The overworld's GB hedge: the minigame's letters squeezed into 6x3 tiles (96x48 pixels), neatly trimmed.
// Each map pixel looks up the minigame pixel it stands for.
export const MAP_HEDGE = { width: 96, height: 48 };
const MAP_SCALE = { x: 0.65, y: 0.5 };
// The minigame point that the map hedge's top-left corner stands for.
const MAP_ORIGIN = { x: 45.6, y: 52 };
// Where the flagpole stands in the map hedge, between the letters, as on the minigame screen.
export const MAP_HEDGE_POLE_X = Math.round((POLE_X - MAP_ORIGIN.x) * MAP_SCALE.x);

export function mapHedgeLayers(): Layer[] {
    const inside = (x: number, y: number) => x >= 0 && y >= 0 && x < MAP_HEDGE.width && y < MAP_HEDGE.height
        && distanceAt(
            Math.floor(MAP_ORIGIN.x + (x + 0.5) / MAP_SCALE.x),
            Math.floor(MAP_ORIGIN.y + (y + 0.5) / MAP_SCALE.y)
        ) <= HEDGE_TRIM.hedgeRadius;
    const runs = new Map<string, string[]>();

    for (let y = 0; y < MAP_HEDGE.height; y++) {
        let start = 0;
        let current: string | null = null;

        for (let x = 0; x <= MAP_HEDGE.width; x++) {
            const color = x < MAP_HEDGE.width ? mapHedgeColor(x, y, inside) : null;
            if (color !== current) {
                if (current) {
                    runs.set(current, [...(runs.get(current) ?? []), rectPath(start, y, x - start, 1)]);
                }
                start = x;
                current = color;
            }
        }
    }

    return [...runs].map(([color, rects]) => (color === 'shadow'
        ? { color: 'ink', path: rects.join(' '), alpha: 0.25 }
        : { color: color as ColorName, path: rects.join(' ') }));
}

// The same look as a trimmed hedge in the minigame. 'shadow' is ink at 25%.
function mapHedgeColor(x: number, y: number, inside: (x: number, y: number) => boolean): ColorName | 'shadow' | null {
    if (!inside(x, y)) {
        return inside(x, y - 1) || inside(x, y - 2) ? 'shadow' : null;
    }
    if (!inside(x, y - 1)) {
        return 'leafLight';
    }
    if (!inside(x, y + 1) || !inside(x - 1, y) || !inside(x + 1, y)) {
        return 'leafDark';
    }
    return noise(x, y, 4) < 0.1 ? 'leafLight' : 'leaf';
}

// The backdrop: sky, a treeline like the woods behind the real hedge, the flagpole, the lawn, and the mulch bed.
export const LAWN_BACKGROUND: Layer[] = [
    { color: 'sky', path: rectPath(0, 0, WIDTH, 30) },
    { color: 'treeline', path: columns((x) => 8 + Math.round(4 * Math.sin(x / 9) + 3 * Math.sin(x / 4.3 + 1)), 44) },
    { color: 'leafDark', path: columns((x) => 14 + Math.round(4 * Math.sin(x / 6 + 2) + 2 * Math.sin(x / 2.7)), 40) },
    { color: 'leaf', path: columns((x) => 24 + Math.round(5 * Math.sin(x / 11 + 4) + 2 * Math.sin(x / 3.1)), 36) },
    { color: 'grass', path: rectPath(0, 44, WIDTH, HEIGHT - 44) },
    { color: 'lawnMowed', path: stripes(44, 10) },
    { color: 'grassDark', path: roundedRect(MULCH.x - 1, MULCH.y - 1, MULCH.width + 2, MULCH.height + 2, 7) },
    { color: 'mulch', path: roundedRect(MULCH.x, MULCH.y, MULCH.width, MULCH.height, 6) },
    { color: 'mulchDark', path: speckles(0) },
    { color: 'mulchLight', path: speckles(1) },
    // The flagpole and its flag, between the G and the B.
    { color: 'whiteCream', path: rectPath(POLE_X, 6, 1, 96) },
    { color: 'steel', path: `${rectPath(POLE_X + 1, 6, 1, 96)} ${rectPath(POLE_X - 2, 100, 6, 2)}` },
    { color: 'gold', path: rectPath(POLE_X - 1, 4, 3, 2) },
    { color: 'red', path: [8, 10, 12, 14, 16].map((y) => rectPath(POLE_X + 2, y, 16, 1)).join(' ') },
    { color: 'whiteCream', path: [9, 11, 13, 15, 17].map((y) => rectPath(POLE_X + 2, y, 16, 1)).join(' ') },
    { color: 'facadeNavy', path: rectPath(POLE_X + 2, 8, 7, 5) },
    { color: 'whiteCream', path: [[3, 9], [5, 9], [7, 9], [4, 11], [6, 11]].map(([x, y]) => rectPath(POLE_X + x, y, 1, 1)).join(' ') }
];

// The hedge clippers drawn at the cutting point, 9x9, with the blades meeting at (4, 4).
export const CLIPPERS: Layer[] = [
    { color: 'ink', path: 'M0 0h2v1h-2z M1 1h2v1h-2z M2 2h2v1h-2z M7 0h2v1h-2z M6 1h2v1h-2z M5 2h2v1h-2z M3 3h3v3h-3z' },
    { color: 'steelLight', path: 'M0 0h1v1h-1z M1 1h1v1h-1z M2 2h1v1h-1z M8 0h1v1h-1z M7 1h1v1h-1z M6 2h1v1h-1z' },
    { color: 'red', path: 'M2 6h2v1h-2z M1 7h2v2h-2z M5 6h2v1h-2z M6 7h2v2h-2z' },
    { color: 'gold', path: 'M4 4h1v1h-1z' }
];

// One 1-pixel column per x, from `top(x)` down to `bottom`.
function columns(top: (x: number) => number, bottom: number): string {
    const parts: string[] = [];

    for (let x = 0; x < WIDTH; x++) {
        const y = top(x);
        parts.push(rectPath(x, y, 1, bottom - y));
    }

    return parts.join(' ');
}

// Mowed bands across the lawn, every other `band` rows.
function stripes(top: number, band: number): string {
    const parts: string[] = [];

    for (let y = top; y < HEIGHT; y += band * 2) {
        parts.push(rectPath(0, y, WIDTH, Math.min(band, HEIGHT - y)));
    }

    return parts.join(' ');
}

function roundedRect(x: number, y: number, width: number, height: number, corner: number): string {
    const parts: string[] = [];

    for (let row = 0; row < height; row++) {
        const fromEdge = Math.min(row, height - 1 - row);
        const inset = fromEdge < corner ? Math.round(corner - Math.sqrt(corner ** 2 - (corner - fromEdge) ** 2)) : 0;
        parts.push(rectPath(x + inset, y + row, width - inset * 2, 1));
    }

    return parts.join(' ');
}

// Bits of bark scattered over the mulch bed, away from its rounded corners.
function speckles(seed: number): string {
    const parts: string[] = [];

    for (let y = MULCH.y + 3; y < MULCH.y + MULCH.height - 3; y++) {
        for (let x = MULCH.x + 4; x < MULCH.x + MULCH.width - 4; x++) {
            if (noise(x, y, 10 + seed) < 0.08) {
                parts.push(rectPath(x, y, seed === 0 ? 2 : 1, 1));
            }
        }
    }

    return parts.join(' ');
}
