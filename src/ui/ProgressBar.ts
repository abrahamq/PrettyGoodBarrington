// A horizontal bar that fills from the left, like the mockups' TIME bar:
// a 1px ink border, a parchment "empty" part, and a colored "full" part.
import type { GameObjects, Scene } from 'phaser';
import { colorNumber, type ColorName } from '../palette.ts';

export class ProgressBar {
    private readonly parts: GameObjects.Rectangle[];
    private readonly fill: GameObjects.Rectangle;
    private readonly innerWidth: number;

    constructor(scene: Scene, x: number, y: number, width: number, height: number, color: ColorName) {
        this.innerWidth = width - 2;

        const border = scene.add.rectangle(x, y, width, height, colorNumber('ink')).setOrigin(0);
        const empty = scene.add.rectangle(x + 1, y + 1, this.innerWidth, height - 2, colorNumber('parchment')).setOrigin(0);
        this.fill = scene.add.rectangle(x + 1, y + 1, this.innerWidth, height - 2, colorNumber(color)).setOrigin(0);
        this.parts = [border, empty, this.fill];
    }

    // Objects with the same depth draw in the order they were added, so the fill stays on top.
    setDepth(depth: number): this {
        for (const part of this.parts) {
            part.setDepth(depth);
        }
        return this;
    }

    // 0 is empty, 1 is full. The fill snaps to whole pixels.
    setFraction(fraction: number): void {
        const clamped = Math.max(0, Math.min(1, fraction));
        this.fill.width = Math.round(this.innerWidth * clamped);
    }

    setColor(color: ColorName): void {
        this.fill.setFillStyle(colorNumber(color));
    }
}
