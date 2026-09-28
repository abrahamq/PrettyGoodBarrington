// Art for Order Up!, copied from docs/mocks/GBEats.dc.html: the kitchen backdrop (240x160) with the grill,
// the patty in each stage of doneness, smoke for burnt patties, the finished burger, and ticket icons.
// Order tickets, the HUD, and the popups are drawn by the scene.
import type { Doneness } from '../logic/orderUp.ts';
import type { Layer, Offset } from './paint.ts';
import { rectPath } from './svgPath.ts';

function grid(stepX: number, stepY: number, fromX: number, toX: number, fromY: number, toY: number): Offset[] {
    const offsets: Offset[] = [];
    for (let y = fromY; y < toY; y += stepY) {
        for (let x = fromX; x < toX; x += stepX) {
            offsets.push([x, y]);
        }
    }
    return offsets;
}

export const KITCHEN_BACKGROUND: Layer[] = [
    // Tile wall, checker band, steel backsplash, ticket rail
    { color: 'cream', path: rectPath(0, 0, 240, 56) },
    { color: 'dinerGrout', path: 'M0 3h8v1h-8z M3 0h1v3h-1z', at: grid(8, 4, 0, 240, 0, 56) },
    { color: 'cream', path: rectPath(0, 56, 240, 4) },
    { color: 'ink', path: 'M0 0h2v2h-2z M4 0h2v2h-2z M2 2h2v2h-2z M6 2h2v2h-2z', at: grid(8, 4, 0, 240, 56, 60) },
    { color: 'steel', path: rectPath(0, 60, 240, 60) },
    { color: 'steelLight', path: 'M0 60h240v1h-240z' },
    { color: 'curbStone', path: rectPath(90, 6, 148, 2) },

    // Grill: frame, cooking surface, worn lines, front panel with knobs
    { color: 'coneHolder', path: rectPath(16, 64, 150, 56) },
    { color: 'grillTop', path: rectPath(20, 68, 142, 46) },
    { color: 'grillLine', path: 'M24 72h20v1h-20z M90 104h30v1h-30z M140 74h14v1h-14z M60 110h18v1h-18z' },
    { color: 'grillFront', path: rectPath(16, 114, 150, 6) },
    { color: 'ink', path: 'M30 115h4v4h-4z M60 115h4v4h-4z M90 115h4v4h-4z M120 115h4v4h-4z M150 115h4v4h-4z' },
    { color: 'awning', path: 'M31 115h2v1h-2z M61 115h2v1h-2z M91 115h2v1h-2z M121 115h2v1h-2z M151 115h2v1h-2z' },

    // Pass-through board with a plate and a carton of fries
    { color: 'wood', path: rectPath(174, 66, 60, 48) },
    { color: 'counterTop', path: rectPath(176, 68, 56, 44) },
    { color: 'whiteCream', path: 'M180 98h36v4h-36z M184 102h28v2h-28z' },
    { color: 'laneLine', path: 'M216 80h2v8h-2z M219 78h2v10h-2z M222 81h2v7h-2z M225 79h2v9h-2z' },
    { color: 'awning', path: 'M214 86h14v8h-14z' },
    { color: 'cream', path: 'M216 88h10v1h-10z M216 91h10v1h-10z' },

    // Counter lip and green floor
    { color: 'steelLight', path: rectPath(0, 120, 240, 3) },
    { color: 'teal', path: rectPath(0, 123, 240, 37) },
    { color: 'kitchenFloorLine', path: 'M0 130h240v1h-240z M0 150h240v1h-240z' }
];

// 16x10: a patty seen from above.
const PATTY_SHAPE = 'M2 0h12v1h-12z M0 1h16v8h-16z M2 9h12v1h-12z';
const SPECKS = 'M4 3h2v1h-2z M10 6h3v1h-3z M6 7h2v1h-2z';
const GRILL_MARKS = 'M3 3h10v1h-10z M3 6h10v1h-10z';

export const PATTIES: Record<Doneness, Layer[]> = {
    raw: [{ color: 'strawberryShade', path: PATTY_SHAPE }, { color: 'pink', path: SPECKS }],
    rare: [{ color: 'pattyRare', path: PATTY_SHAPE }, { color: 'pattyRareLight', path: SPECKS }],
    medium: [{ color: 'wood', path: PATTY_SHAPE }, { color: 'bark', path: GRILL_MARKS }],
    well: [{ color: 'bark', path: PATTY_SHAPE }, { color: 'chocShade', path: GRILL_MARKS }],
    burnt: [{ color: 'ink', path: PATTY_SHAPE }, { color: 'awning', path: 'M4 4h1v1h-1z M11 6h1v1h-1z' }]
};

// 10x11: smoke puffs over a burnt patty.
export const SMOKE: Layer[] = [{ color: 'smoke', path: 'M1 8h4v3h-4z M5 4h5v4h-5z M0 0h4v3h-4z' }];

// 20x16: the finished burger on the plate.
export const BURGER: Layer[] = [
    { color: 'ochre', path: 'M4 0h12v1h-12z M2 1h16v5h-16z M2 12h16v4h-16z' },
    { color: 'whiteCream', path: 'M6 2h1v1h-1z M11 3h1v1h-1z M14 2h1v1h-1z' },
    { color: 'awning', path: 'M2 6h16v1h-16z' },
    { color: 'leafLight', path: 'M0 7h20v1h-20z' },
    { color: 'bark', path: 'M1 9h18v3h-18z' },
    { color: 'amber', path: 'M1 8h18v1h-18z M4 9h2v2h-2z' }
];

// 7x6 ticket icons for the extras.
export const EXTRA_ICONS = {
    cheese: [{ color: 'amber', path: 'M0 1h7v4h-7z' }, { color: 'wood', path: 'M2 2h1v1h-1z M5 3h1v1h-1z' }],
    fries: [{ color: 'laneLine', path: 'M1 0h1v3h-1z M3 0h1v3h-1z M5 0h1v3h-1z' }, { color: 'awning', path: 'M0 3h7v3h-7z' }]
} satisfies Record<string, Layer[]>;
