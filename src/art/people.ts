// Placeholder art for the player and NPCs. Every character frame is 12x16 pixels, feet on the bottom row.
// The scooper, the local with the red cap, and the dog are copied from docs/mocks/Overworld.dc.html;
// the other shopkeepers reuse one front-facing body with different colors.
// The player is one of three boys (src/data/characters.ts). Each stands at his own height inside the frame:
// the 5-year-old is 11 pixels tall, the 11-year-old 14, and the 15-year-old 16, as tall as the adults.
import type { CharacterId } from '../data/characters.ts';
import { drawLayers, type Layer, type PixelTarget } from './paint.ts';
import type { ColorName } from '../palette.ts';

export const CHARACTER_WIDTH = 12;
export const CHARACTER_HEIGHT = 16;

// Rows of each player spritesheet, top to bottom. Each row has 3 frames: standing, left foot, right foot.
export const PLAYER_ROWS = ['down', 'left', 'right', 'up'] as const;
export const PLAYER_FRAMES_PER_ROW = 3;
export const PLAYER_SHEET_WIDTH = CHARACTER_WIDTH * PLAYER_FRAMES_PER_ROW;
export const PLAYER_SHEET_HEIGHT = CHARACTER_HEIGHT * PLAYER_ROWS.length;

export type PlayerRow = (typeof PLAYER_ROWS)[number];

const SHADOW: Layer = { color: 'ink', path: 'M2 15h8v1h-8z', alpha: 0.25 };
const LEGS = [
    'M3 13h2v3h-2z M7 13h2v3h-2z',
    'M3 13h2v2h-2z M7 13h2v3h-2z',
    'M3 13h2v3h-2z M7 13h2v2h-2z'
];

interface BoyArt {
    // Everything above the legs. The right-facing row mirrors `left`.
    views: Record<'down' | 'left' | 'up', Layer[]>;
    // Standing, left foot forward, right foot forward. Drawn in ink.
    legs: string[];
}

const BOYS: Record<CharacterId, BoyArt> = {
    five: {
        views: {
            down: [
                { color: 'skinFair', path: 'M3 7h6v2h-6z M4 9h4v1h-4z M3 11h1v2h-1z M8 11h1v2h-1z' },
                { color: 'hairMousey', path: 'M4 5h4v1h-4z M3 6h6v1h-6z M3 7h1v1h-1z M8 7h1v1h-1z' },
                { color: 'eyeLightBrown', path: 'M4 8h1v1h-1z M7 8h1v1h-1z' },
                { color: 'awning', path: 'M4 10h4v3h-4z M3 10h1v1h-1z M8 10h1v1h-1z' },
                { color: 'ink', path: 'M4 10h1v1h-1z M7 10h1v1h-1z M5 11h2v2h-2z' }
            ],
            left: [
                { color: 'skinFair', path: 'M3 7h5v2h-5z M3 9h4v1h-4z M2 8h1v1h-1z' },
                { color: 'hairMousey', path: 'M4 5h4v1h-4z M3 6h6v1h-6z M7 7h2v1h-2z M8 8h1v1h-1z' },
                { color: 'eyeLightBrown', path: 'M4 8h1v1h-1z' },
                { color: 'awning', path: 'M4 10h4v3h-4z' }
            ],
            up: [
                { color: 'skinFair', path: 'M4 9h4v1h-4z M3 11h1v2h-1z M8 11h1v2h-1z' },
                { color: 'hairMousey', path: 'M4 5h4v1h-4z M3 6h6v3h-6z' },
                { color: 'awning', path: 'M4 10h4v3h-4z M3 10h1v1h-1z M8 10h1v1h-1z' }
            ]
        },
        legs: [
            'M4 13h1v3h-1z M7 13h1v3h-1z',
            'M4 13h1v2h-1z M7 13h1v3h-1z',
            'M4 13h1v3h-1z M7 13h1v2h-1z'
        ]
    },
    eleven: {
        views: {
            down: [
                { color: 'skinMid', path: 'M3 4h6v4h-6z M2 9h1v3h-1z M9 9h1v3h-1z' },
                { color: 'hairBrown', path: 'M3 2h6v1h-6z M2 3h8v1h-8z M2 4h1v3h-1z M9 4h1v3h-1z M3 4h3v1h-3z' },
                { color: 'hairBrown', path: 'M4 5h1v1h-1z M7 5h1v1h-1z' },
                { color: 'teal', path: 'M3 8h6v5h-6z M2 8h1v1h-1z M9 8h1v1h-1z' }
            ],
            left: [
                { color: 'skinMid', path: 'M3 4h5v4h-5z M2 6h1v1h-1z' },
                { color: 'hairBrown', path: 'M3 2h6v2h-6z M7 4h2v2h-2z M8 6h1v1h-1z M3 4h2v1h-2z' },
                { color: 'hairBrown', path: 'M4 5h1v1h-1z' },
                { color: 'teal', path: 'M3 8h6v5h-6z' }
            ],
            up: [
                { color: 'skinMid', path: 'M4 7h4v1h-4z M2 9h1v3h-1z M9 9h1v3h-1z' },
                { color: 'hairBrown', path: 'M3 2h6v1h-6z M2 3h8v4h-8z' },
                { color: 'teal', path: 'M3 8h6v5h-6z M2 8h1v1h-1z M9 8h1v1h-1z' }
            ]
        },
        legs: LEGS
    },
    fifteen: {
        views: {
            down: [
                { color: 'skinFair', path: 'M3 2h6v4h-6z M5 6h2v1h-2z M3 9h1v3h-1z M8 9h1v3h-1z' },
                { color: 'hairBlonde', path: 'M3 0h6v2h-6z M3 2h3v1h-3z M3 3h1v1h-1z M8 2h1v2h-1z' },
                { color: 'eyeBlue', path: 'M4 3h1v1h-1z M7 3h1v1h-1z' },
                { color: 'facadeNavy', path: 'M4 7h4v5h-4z M3 7h1v2h-1z M8 7h1v2h-1z' }
            ],
            left: [
                { color: 'skinFair', path: 'M3 2h5v4h-5z M2 4h1v1h-1z M5 6h2v1h-2z' },
                { color: 'hairBlonde', path: 'M3 0h6v2h-6z M7 2h2v2h-2z M8 4h1v1h-1z M3 2h2v1h-2z' },
                { color: 'eyeBlue', path: 'M4 3h1v1h-1z' },
                { color: 'facadeNavy', path: 'M4 7h4v5h-4z' }
            ],
            up: [
                { color: 'skinFair', path: 'M4 5h4v1h-4z M5 6h2v1h-2z M3 9h1v3h-1z M8 9h1v3h-1z' },
                { color: 'hairBlonde', path: 'M3 0h6v5h-6z' },
                { color: 'facadeNavy', path: 'M4 7h4v5h-4z M3 7h1v2h-1z M8 7h1v2h-1z' }
            ]
        },
        legs: [
            'M4 12h4v1h-4z M4 13h1v3h-1z M7 13h1v3h-1z',
            'M4 12h4v1h-4z M4 13h1v2h-1z M7 13h1v3h-1z',
            'M4 12h4v1h-4z M4 13h1v3h-1z M7 13h1v2h-1z'
        ]
    }
};

export function playerTextureKey(character: CharacterId): string {
    return `player-${character}`;
}

export function walkAnimationKey(character: CharacterId, row: PlayerRow): string {
    return `${playerTextureKey(character)}-walk-${row}`;
}

export function playerFrame(character: CharacterId, row: PlayerRow, step: number): { layers: Layer[]; mirror: boolean } {
    const boy = BOYS[character];
    const view = boy.views[row === 'right' ? 'left' : row];
    const layers = [SHADOW, ...view, { color: 'ink', path: boy.legs[step] } satisfies Layer];

    return { layers, mirror: row === 'right' };
}

// Jack mows the town lawn and runs Trim the GB. His art exists only as a painted PNG: two 20x22 frames stacked
// top to bottom, of him behind his mower. The game shows only the top frame, standing still.
// He stands on one tile, and his art hangs over its edges.
export const JACK = {
    key: 'npc-jack',
    url: 'assets/sprites/jack_sprite.png',
    frameWidth: 20,
    frameHeight: 22
} as const;

export function spriteUrl(key: string): string {
    return `assets/sprites/${key}.png`;
}

export function drawPlayerSheet(target: PixelTarget, character: CharacterId): void {
    PLAYER_ROWS.forEach((row, rowIndex) => {
        for (let step = 0; step < PLAYER_FRAMES_PER_ROW; step++) {
            const frame = playerFrame(character, row, step);
            drawLayers(target, frame.layers, {
                x: step * CHARACTER_WIDTH,
                y: rowIndex * CHARACTER_HEIGHT,
                width: CHARACTER_WIDTH,
                height: CHARACTER_HEIGHT,
                mirror: frame.mirror
            });
        }
    });
}

export function drawNpc(target: PixelTarget, key: NpcKey): void {
    drawLayers(target, NPC_ART[key], { width: CHARACTER_WIDTH, height: CHARACTER_HEIGHT });
}

interface PersonColors {
    hair: ColorName;
    skin: ColorName;
    shirt: ColorName;
}

function person({ hair, skin, shirt }: PersonColors, extras: Layer[]): Layer[] {
    return [
        SHADOW,
        { color: skin, path: 'M3 2h6v5h-6z' },
        { color: hair, path: 'M3 0h6v2h-6z M2 1h1v4h-1z M9 1h1v4h-1z' },
        { color: 'ink', path: 'M4 4h1v1h-1z M7 4h1v1h-1z' },
        { color: shirt, path: 'M2 7h8v6h-8z' },
        { color: skin, path: 'M1 8h1v4h-1z M10 8h1v4h-1z' },
        { color: 'ink', path: LEGS[0] },
        ...extras
    ];
}

export const NPC_ART = {
    'npc-scooper': [
        SHADOW,
        { color: 'whiteCream', path: 'M3 0h6v2h-6z' },
        { color: 'pink', path: 'M3 2h6v1h-6z' },
        { color: 'ink', path: 'M2 2h1v4h-1z M9 2h1v4h-1z' },
        { color: 'skinTan', path: 'M3 3h6v4h-6z' },
        { color: 'ink', path: 'M4 4h1v2h-1z M7 4h1v2h-1z' },
        { color: 'brickMortar', path: 'M5 6h2v1h-2z' },
        { color: 'teal', path: 'M2 7h8v6h-8z' },
        { color: 'whiteCream', path: 'M3 8h6v5h-6z' },
        { color: 'skinTan', path: 'M1 8h1v4h-1z M10 8h1v4h-1z' },
        { color: 'ink', path: LEGS[0] }
    ],
    'npc-grillcook': person({ hair: 'hairBrown', skin: 'skinLight', shirt: 'cream' }, [
        { color: 'whiteCream', path: 'M3 0h6v2h-6z M2 0h1v1h-1z M9 0h1v1h-1z' },
        { color: 'red', path: 'M3 9h6v4h-6z' }
    ]),
    'npc-usher': person({ hair: 'ink', skin: 'skinDeep', shirt: 'red' }, [
        { color: 'gold', path: 'M5 7h2v1h-2z M6 9h1v1h-1z M6 11h1v1h-1z' }
    ]),
    'npc-pizzaiolo': person({ hair: 'ink', skin: 'skinLight', shirt: 'whiteCream' }, [
        { color: 'whiteCream', path: 'M3 0h6v2h-6z' },
        { color: 'ink', path: 'M4 6h4v1h-4z' },
        { color: 'awning', path: 'M4 7h4v1h-4z' }
    ]),
    'npc-projectionist': person({ hair: 'hairBrown', skin: 'skinTan', shirt: 'facadeNavy' }, [
        { color: 'ink', path: 'M3 4h6v1h-6z' }
    ]),
    'npc-grocer': person({ hair: 'hairGray', skin: 'skinLight', shirt: 'cream' }, [
        { color: 'signGreen', path: 'M3 8h6v5h-6z' }
    ]),
    'npc-clerk': person({ hair: 'hairGray', skin: 'skinDeep', shirt: 'facadeNavy' }, [
        { color: 'cream', path: 'M4 7h1v1h-1z M7 7h1v1h-1z' },
        { color: 'red', path: 'M5 7h2v4h-2z' }
    ]),
    'npc-ranger': person({ hair: 'hairBrown', skin: 'skinTan', shirt: 'paverJoint' }, [
        { color: 'bark', path: 'M3 0h6v1h-6z M2 1h8v1h-8z' },
        { color: 'gold', path: 'M4 9h1v1h-1z' }
    ]),
    'npc-local': [
        SHADOW,
        { color: 'awning', path: 'M3 0h6v1h-6z M2 1h8v2h-8z' },
        { color: 'hairBrown', path: 'M2 3h8v4h-8z' },
        { color: 'skinLight', path: 'M1 4h1v2h-1z M10 4h1v2h-1z M5 7h2v1h-2z' },
        { color: 'carBlue', path: 'M2 8h8v5h-8z' },
        { color: 'facadeMustard', path: 'M3 8h6v4h-6z' },
        { color: 'plank', path: 'M3 8h6v1h-6z' },
        { color: 'skinLight', path: 'M1 8h1v4h-1z M10 8h1v4h-1z' },
        { color: 'ink', path: LEGS[0] }
    ],
    'npc-dog': [
        { color: 'wood', path: 'M2 2h8v3h-8z M0 1h3v3h-3z M10 1h1v2h-1z', at: [[0, 9]] },
        { color: 'hairBrown', path: 'M1 0h1v1h-1z M3 5h1v2h-1z M8 5h1v2h-1z', at: [[0, 9]] },
        { color: 'ink', path: 'M0 2h1v1h-1z', at: [[0, 9]] }
    ]
} satisfies Record<string, Layer[]>;

export type NpcKey = keyof typeof NPC_ART;
export const NPC_KEYS = Object.keys(NPC_ART) as NpcKey[];
