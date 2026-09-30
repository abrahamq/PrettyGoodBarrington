// Art for Curtain Call, copied from docs/mocks/Mahaiwe.dc.html: the stage backdrop (240x160) with four lanes,
// curtains, a gold proscenium, and the audience; the 12x12 arrow for notes and targets; and a hit sparkle.
import type { ColorName } from '../palette.ts';
import type { Layer, Offset } from './paint.ts';
import { rectPath } from './svgPath.ts';

// The four lanes (left, down, up, right) are 24 pixels wide, side by side from x = 72.
export const LANE_LEFT = 72;
export const LANE_WIDTH = 24;
export const LANE_COLORS: ColorName[] = ['pink', 'sky', 'amber', 'mint'];

function grid(stepX: number, stepY: number, fromX: number, toX: number, fromY: number, toY: number): Offset[] {
    const offsets: Offset[] = [];
    for (let y = fromY; y < toY; y += stepY) {
        for (let x = fromX; x < toX; x += stepX) {
            offsets.push([x, y]);
        }
    }
    return offsets;
}

// A curtain is a stack of rectangles (it narrows toward the floor, like the mockup). Its folds repeat every
// 6 pixels: a light line 1 pixel in, and a 2-pixel shadow 4 pixels in, cut off at each rectangle's edge.
function curtain(parts: [number, number, number, number][]): Layer[] {
    const light: string[] = [];
    const shade: string[] = [];

    for (const [left, top, width, height] of parts) {
        const right = left + width;
        for (let fold = left - (left % 6); fold < right; fold += 6) {
            if (fold + 1 >= left && fold + 2 <= right) {
                light.push(rectPath(fold + 1, top, 1, height));
            }
            const shadeLeft = Math.max(fold + 4, left);
            const shadeRight = Math.min(fold + 6, right);
            if (shadeRight > shadeLeft) {
                shade.push(rectPath(shadeLeft, top, shadeRight - shadeLeft, height));
            }
        }
    }

    return [
        { color: 'red', path: parts.map(([x, y, w, h]) => rectPath(x, y, w, h)).join(' ') },
        { color: 'curtainLight', path: light.join(' ') },
        { color: 'curtainShade', path: shade.join(' ') }
    ];
}

const LANE_BOXES = [0, 1, 2, 3].map((i) => rectPath(LANE_LEFT + i * LANE_WIDTH, 8, LANE_WIDTH, 96)).join(' ');
const LANE_LINES = [0, 1, 2, 3, 4].map((i) => rectPath(LANE_LEFT + i * LANE_WIDTH, 8, 1, 96)).join(' ');

export const STAGE_BACKGROUND: Layer[] = [
    { color: 'stageDark', path: rectPath(0, 0, 240, 160) },
    { color: 'stageBack', path: rectPath(20, 8, 200, 104) },
    { color: 'spotlight', path: 'M110 8L130 8L162 108L78 108Z', alpha: 0.12 },

    // Wood stage floor with a pool of spotlight
    { color: 'counterWood', path: rectPath(20, 104, 200, 16) },
    { color: 'wood', path: 'M0 3h16v1h-16z M9 0h1v3h-1z', at: grid(16, 4, 20, 209, 104, 120) },
    {
        color: 'spotlight',
        alpha: 0.2,
        path: 'M103 106h34v1h-34z M91 107h58v1h-58z M85 108h70v1h-70z M82 109h76v1h-76z M80 110h80v2h-80z M82 112h76v1h-76z M85 113h70v1h-70z M91 114h58v1h-58z M103 115h34v1h-34z'
    },
    { color: 'hairBrown', path: rectPath(20, 120, 200, 3) },

    // Lanes and the gold hit line
    { color: 'laneShadow', path: LANE_BOXES, alpha: 0.5 },
    { color: 'laneEdge', path: LANE_LINES, alpha: 0.6 },
    { color: 'gold', path: rectPath(LANE_LEFT, 86, LANE_WIDTH * 4 + 1, 1), alpha: 0.8 },

    // Curtains with gold tiebacks
    ...curtain([[20, 8, 44, 40], [20, 48, 40, 20], [20, 68, 34, 20], [20, 88, 30, 32]]),
    ...curtain([[176, 8, 44, 40], [180, 48, 40, 20], [186, 68, 34, 20], [190, 88, 30, 32]]),
    { color: 'amber', path: 'M44 86h10v3h-10z M186 86h10v3h-10z' },

    // Valance and the gold proscenium frame
    { color: 'curtainShade', path: rectPath(20, 8, 200, 10) },
    { color: 'curtainShade', path: 'M0 0h10v2h-10z', at: grid(20, 1, 20, 220, 18, 19) },
    { color: 'stageFrame', path: rectPath(20, 17, 200, 1) },
    { color: 'stageFrame', path: 'M16 4h208v4h-208z M16 4h4v120h-4z M220 4h4v120h-4z' },
    { color: 'stageFrameDark', path: rectPath(20, 8, 200, 1) },

    // The audience, in two rows of silhouettes
    { color: 'laneShadow', path: rectPath(0, 124, 240, 36) },
    { color: 'audienceHead', path: 'M30 124h2v4h-2z M36 124h2v4h-2z M150 122h2v5h-2z M156 122h2v5h-2z M204 124h2v4h-2z' },
    { color: 'audienceHead', path: 'M0 0h8v7h-8z', at: grid(16, 1, 4, 240, 131, 132) },
    { color: 'audienceBack', path: 'M0 0h10v10h-10z', at: grid(16, 1, 10, 240, 144, 145) },
    { color: 'audienceFloor', path: rectPath(0, 152, 240, 8) }
];

// 12x12, pointing up. The scene turns it for the other lanes.
const ARROW_PATH = 'M5 1h2v1h-2z M4 2h4v1h-4z M3 3h6v1h-6z M2 4h8v1h-8z M4 5h4v6h-4z';

export function arrow(color: ColorName): Layer[] {
    return [{ color, path: ARROW_PATH }];
}

// 28x26: bright bits around a target on a Great hit. Centered on (14, 14).
export const SPARKLE: Layer[] = [
    { color: 'spotlight', path: 'M13 0h2v4h-2z M13 24h2v2h-2z M0 13h4v2h-4z M24 13h4v2h-4z M4 3h2v2h-2z M22 3h2v2h-2z M4 22h2v2h-2z M22 22h2v2h-2z' }
];
