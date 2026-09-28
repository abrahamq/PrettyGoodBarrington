// Paints SVG-style paths one pixel row at a time, so every edge stays crisp.
// A "target" is anything that can fill a rectangle: a Phaser Graphics object in the game,
// or a PixelBuffer when the map script writes tiles.png.
import type { GameObjects } from 'phaser';
import { colorNumber, type ColorName } from '../palette.ts';
import { pathToSpans } from './svgPath.ts';

export type Offset = [number, number];

export interface Layer {
    color: ColorName;
    path: string;
    // Paint the path once at each offset (for repeating patterns). Defaults to [[0, 0]].
    at?: Offset[];
    alpha?: number;
}

export interface PixelTarget {
    fillRect(x: number, y: number, width: number, height: number, color: number, alpha: number): void;
}

export interface DrawOptions {
    // Where the art's (0, 0) lands on the target.
    x?: number;
    y?: number;
    // When set, nothing is drawn outside a box of this size, and `mirror` flips the art inside it.
    width?: number;
    height?: number;
    mirror?: boolean;
}

export function drawLayers(target: PixelTarget, layers: Layer[], options: DrawOptions = {}): void {
    const { x = 0, y = 0, width = Infinity, height = Infinity, mirror = false } = options;

    for (const layer of layers) {
        const color = colorNumber(layer.color);
        const alpha = layer.alpha ?? 1;

        for (const [dx, dy] of layer.at ?? [[0, 0]]) {
            for (const span of pathToSpans(layer.path)) {
                const row = span.y + dy;
                let left = span.x + dx;
                let right = left + span.width;

                left = Math.max(left, 0);
                right = Math.min(right, width);
                if (row < 0 || row >= height || right <= left) {
                    continue;
                }

                const drawLeft = mirror ? width - right : left;
                target.fillRect(x + drawLeft, y + row, right - left, 1, color, alpha);
            }
        }
    }
}

export function graphicsTarget(graphics: GameObjects.Graphics): PixelTarget {
    return {
        fillRect(x, y, width, height, color, alpha) {
            graphics.fillStyle(color, alpha);
            graphics.fillRect(x, y, width, height);
        }
    };
}
