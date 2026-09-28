// Paints SVG-style paths onto a Phaser Graphics object one pixel row at a time, so every edge stays crisp.
import type { GameObjects } from 'phaser';
import { colorNumber, type ColorName } from '../palette.ts';
import { pathToSpans } from './svgPath.ts';

export interface Layer {
    color: ColorName;
    path: string;
}

export function paintPath(graphics: GameObjects.Graphics, color: ColorName, path: string): void {
    graphics.fillStyle(colorNumber(color));

    for (const span of pathToSpans(path)) {
        graphics.fillRect(span.x, span.y, span.width, 1);
    }
}

export function paintLayers(graphics: GameObjects.Graphics, layers: Layer[]): void {
    for (const layer of layers) {
        paintPath(graphics, layer.color, layer.path);
    }
}
