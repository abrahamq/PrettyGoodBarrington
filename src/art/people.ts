// Placeholder art for the player and NPCs. Every character is 12x16 pixels.
// The scooper, the local with the red cap, the dog, and the player's side view are copied from
// docs/mocks/Overworld.dc.html; the other shopkeepers reuse one front-facing body with different colors.
import type { Layer } from './paint.ts';
import type { ColorName } from '../palette.ts';

export const CHARACTER_WIDTH = 12;
export const CHARACTER_HEIGHT = 16;

export const PLAYER_KEY = 'player';
// Rows of the player spritesheet, top to bottom. Each row has 3 frames: standing, left foot, right foot.
export const PLAYER_ROWS = ['down', 'left', 'right', 'up'] as const;
export const PLAYER_FRAMES_PER_ROW = 3;

const SHADOW: Layer = { color: 'ink', path: 'M2 15h8v1h-8z', alpha: 0.25 };
const LEGS = [
    'M3 13h2v3h-2z M7 13h2v3h-2z',
    'M3 13h2v2h-2z M7 13h2v3h-2z',
    'M3 13h2v3h-2z M7 13h2v2h-2z'
];

const PLAYER_BODY: Layer[] = [
    { color: 'shirtOlive', path: 'M2 7h8v6h-8z' },
    { color: 'awning', path: 'M3 7h6v1h-6z' }
];

const PLAYER_HEAD: Record<'down' | 'left' | 'up', Layer[]> = {
    down: [
        { color: 'skinLight', path: 'M3 2h6v5h-6z M1 8h1v4h-1z M10 8h1v4h-1z' },
        { color: 'ochre', path: 'M3 0h6v2h-6z M2 1h1v4h-1z M9 1h1v4h-1z' },
        { color: 'ink', path: 'M4 4h1v1h-1z M7 4h1v1h-1z' }
    ],
    left: [
        { color: 'ochre', path: 'M3 0h6v3h-6z M8 1h1v5h-1z' },
        { color: 'skinLight', path: 'M3 3h5v4h-5z' },
        { color: 'ink', path: 'M4 4h1v1h-1z' }
    ],
    up: [
        { color: 'skinLight', path: 'M4 6h4v1h-4z M1 8h1v4h-1z M10 8h1v4h-1z' },
        { color: 'ochre', path: 'M3 0h6v6h-6z M2 1h8v4h-8z' }
    ]
};

// The right-facing row is the left-facing art, mirrored.
export function playerFrame(row: (typeof PLAYER_ROWS)[number], step: number): { layers: Layer[]; mirror: boolean } {
    const head = PLAYER_HEAD[row === 'right' ? 'left' : row];
    const layers = [SHADOW, ...PLAYER_BODY, ...head, { color: 'ink', path: LEGS[step] } satisfies Layer];

    return { layers, mirror: row === 'right' };
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
