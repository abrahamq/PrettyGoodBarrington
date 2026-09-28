// A UI panel: cream fill inside ink, parchment, and wood border lines (texture "ui-panel"),
// drawn as a 9-slice so it stretches to any size and keeps its 1-pixel borders sharp.
import type { GameObjects, Scene } from 'phaser';
import { TEXTURES } from '../art/textures.ts';
import { colorNumber } from '../palette.ts';

export const PANEL_BORDER = 3;
const SHADOW_OFFSET = 2;

export interface PanelOptions {
    shadow?: boolean;
}

export class Panel {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
    private readonly parts: GameObjects.GameObject[] = [];

    constructor(scene: Scene, x: number, y: number, width: number, height: number, options: PanelOptions = {}) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;

        if (options.shadow) {
            const shadow = scene.add.rectangle(x + SHADOW_OFFSET, y + SHADOW_OFFSET, width, height, colorNumber('ink'), 0.5);
            this.parts.push(shadow.setOrigin(0));
        }

        const frame = scene.add.nineslice(
            x, y, TEXTURES.panel, undefined, width, height,
            PANEL_BORDER, PANEL_BORDER, PANEL_BORDER, PANEL_BORDER
        );
        this.parts.push(frame.setOrigin(0));
    }

    destroy(): void {
        for (const part of this.parts) {
            part.destroy();
        }
    }
}
