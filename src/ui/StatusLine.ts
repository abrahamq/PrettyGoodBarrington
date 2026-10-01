// A one-line, centered message across a menu screen, on a dark strip so it stays readable over the
// title backdrop (the road there has yellow dashes).
import type { GameObjects, Scene } from 'phaser';
import { CENTER_X, GAME_WIDTH } from '../layout.ts';
import { colorNumber } from '../palette.ts';
import { addPixelText, centeredX } from './text.ts';

const STRIP_PADDING = 2;

export class StatusLine {
    private readonly text: GameObjects.Text;

    constructor(scene: Scene, y: number) {
        scene.add.rectangle(0, y - STRIP_PADDING, GAME_WIDTH, 8 + STRIP_PADDING * 2, colorNumber('ink'), 0.8).setOrigin(0);
        this.text = addPixelText(scene, 0, y, '', 'cream');
    }

    show(message: string): void {
        this.text.setText(message);
        this.text.x = centeredX(message, CENTER_X);
    }
}
