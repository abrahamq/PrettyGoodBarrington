// Boot scene: the first scene that runs. For now it only draws a 1-pixel frame, so you can
// check that the canvas is 240x160 and scales up crisply. Phase 1 adds fonts and placeholder textures.
import { Scene } from 'phaser';
import { colorNumber } from '../palette.js';

export class Boot extends Scene {
    constructor() {
        super('Boot');
    }

    create() {
        drawPixelFrame(this);
    }
}

function drawPixelFrame(scene) {
    const { width, height } = scene.scale;
    const frame = scene.add.graphics();

    frame.fillStyle(colorNumber('parchment'));
    frame.fillRect(0, 0, width, 1);
    frame.fillRect(0, height - 1, width, 1);
    frame.fillRect(0, 0, 1, height);
    frame.fillRect(width - 1, 0, 1, height);
}
