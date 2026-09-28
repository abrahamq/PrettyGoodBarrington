// Art for Scoop Stack, copied from docs/mocks/SoCo.dc.html: the creamery backdrop (240x160),
// the waffle cone, the four scoop flavors, and the small scoop icons for the HUD.
// The mockup's framed picture and flavor names are left out: at this game's 8px text size, the HUD panels
// cover the picture, and the names do not fit on the board (DECISIONS.md, Phase 3).
import type { Flavor } from '../logic/scoopStack.ts';
import type { ColorName } from '../palette.ts';
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

export const SHOP_BACKGROUND: Layer[] = [
    // Pink striped wall, mint wainscot
    { color: 'facadePink', path: rectPath(0, 0, 240, 100) },
    { color: 'socoWallStripe', path: 'M0 0h2v100h-2z', at: grid(8, 100, 0, 240, 0, 1) },
    { color: 'mintWainscot', path: rectPath(0, 84, 240, 16) },
    { color: 'mint', path: 'M0 84h240v2h-240z' },
    { color: 'mintTrimDark', path: 'M16 86h1v14h-1z M48 86h1v14h-1z M80 86h1v14h-1z M112 86h1v14h-1z M144 86h1v14h-1z M176 86h1v14h-1z M208 86h1v14h-1z' },

    // Checkered floor
    { color: 'cream', path: rectPath(0, 100, 240, 60) },
    { color: 'socoFloorTile', path: 'M0 0h8v8h-8z M8 8h8v8h-8z', at: grid(16, 16, 0, 240, 100, 160) },

    // One hanging lamp over the cone
    { color: 'ink', path: 'M120 0h1v10h-1z' },
    { color: 'teal', path: 'M116 10h9v4h-9z' },
    { color: 'gold', path: 'M118 14h5v1h-5z' },

    // Flavor board: a swatch per flavor, with little marks where the names would be
    { color: 'wood', path: 'M148 10h80v64h-80z' },
    { color: 'ink', path: 'M151 13h74v58h-74z' },
    { color: 'vanillaIce', path: 'M156 29h5v5h-5z' },
    { color: 'bark', path: 'M156 39h5v5h-5z' },
    { color: 'pink', path: 'M156 49h5v5h-5z' },
    { color: 'mintLight', path: 'M156 59h5v5h-5z' },
    {
        color: 'parchment',
        path: 'M166 31h14v2h-14z M182 31h10v2h-10z M166 41h10v2h-10z M178 41h16v2h-16z M166 51h26v2h-26z M166 61h10v2h-10z M178 61h14v2h-14z'
    },

    // Counter, display case with four tubs, tip jar
    { color: 'counterTop', path: 'M0 122h240v4h-240z' },
    { color: 'counterWood', path: rectPath(0, 126, 240, 34) },
    { color: 'wood', path: 'M0 3h16v1h-16z M7 0h1v3h-1z', at: grid(16, 4, 0, 240, 126, 160) },
    { color: 'ink', path: 'M8 107h64v1h-64z M8 107h1v15h-1z M71 107h1v15h-1z' },
    { color: 'caseGlass', path: 'M9 108h62v14h-62z' },
    { color: 'vanillaIce', path: 'M12 114h12v8h-12z' },
    { color: 'bark', path: 'M26 114h12v8h-12z' },
    { color: 'pink', path: 'M40 114h12v8h-12z' },
    { color: 'mintLight', path: 'M54 114h12v8h-12z' },
    { color: 'glassLight', path: 'M200 111h8v11h-8z' },
    { color: 'amber', path: 'M201 117h6v4h-6z' },
    { color: 'ink', path: 'M200 110h8v1h-8z' }
];

// Where each flavor's swatch sits on the board (top-left), in board order.
export const FLAVOR_SWATCHES: Record<Flavor, [number, number]> = {
    vanilla: [156, 29],
    darkChoc: [156, 39],
    strawberry: [156, 49],
    mintChip: [156, 59]
};

// 16x22: the waffle cone (rows 0-17) in its holder (rows 17-21). Its top row is where the first scoop sits.
export const CONE: Layer[] = [
    { color: 'ochre', path: 'M0 0h16v3h-16z M1 3h14v3h-14z M2 6h12v3h-12z M3 9h10v3h-10z M4 12h8v3h-8z M5 15h6v3h-6z' },
    { color: 'plank', path: 'M2 1h1v1h-1z M6 1h1v1h-1z M10 1h1v1h-1z M14 1h1v1h-1z M4 4h1v1h-1z M8 4h1v1h-1z M12 4h1v1h-1z M6 7h1v1h-1z M10 7h1v1h-1z M8 10h1v1h-1z' },
    { color: 'coneHolder', path: 'M3 17h10v5h-10z' }
];

// 16x11: one scoop. Rows 9-10 are drips that hang over the scoop (or cone) below.
const SCOOP_SHAPE = 'M3 0h10v1h-10z M1 1h14v2h-14z M0 3h16v5h-16z M1 8h14v1h-14z M2 9h3v2h-3z M8 9h2v1h-2z M12 9h2v2h-2z';

function scoop(base: ColorName, shade: ColorName, shine: ColorName, extras: Layer[] = []): Layer[] {
    return [
        { color: base, path: SCOOP_SHAPE },
        { color: shade, path: 'M1 6h14v2h-14z' },
        { color: shine, path: 'M3 2h3v2h-3z' },
        ...extras
    ];
}

export const SCOOPS: Record<Flavor, Layer[]> = {
    vanilla: scoop('vanillaIce', 'vanillaShade', 'white'),
    darkChoc: scoop('bark', 'chocShade', 'chocShine'),
    strawberry: scoop('pink', 'strawberryShade', 'strawberryShine'),
    mintChip: scoop('mintLight', 'mintTrimDark', 'mintShine', [{ color: 'ink', path: 'M5 4h1v1h-1z M10 5h1v1h-1z M7 7h1v1h-1z' }])
};

// 16x12 HUD icons: a scoop for each stacked flavor, and an outline for scoops still to go.
const ICON_SHAPE = 'M3 0h10v1h-10z M1 1h14v2h-14z M0 3h16v6h-16z M2 9h12v2h-12z';

export function scoopIcon(flavor: Flavor): Layer[] {
    const base = SCOOPS[flavor][0].color;
    return [
        { color: base, path: ICON_SHAPE },
        { color: 'ink', path: 'M0 8h16v1h-16z' }
    ];
}

export const EMPTY_SCOOP_ICON: Layer[] = [
    { color: 'emptyScoop', path: 'M3 0h10v1h-10z M1 1h2v1h-2z M13 1h2v1h-2z M0 2h1v7h-1z M15 2h1v7h-1z M1 9h1v1h-1z M14 9h1v1h-1z M2 10h12v1h-12z' }
];
