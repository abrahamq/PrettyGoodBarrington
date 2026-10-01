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
    // For backgrounds: repeat the layer every this many pixels past the stage edges (see drawWide).
    // A half-transparent layer must repeat by its own full width, or the copies overlap and darken.
    repeat?: number;
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

export interface WideOptions {
    stageWidth: number;
    // How far the picture reaches past each side of the stage. The target is stageWidth + 2 * wing wide.
    wing: number;
    height: number;
}

// Draws a background wider than the stage it was designed for. Each layer is drawn on the stage (shifted
// right by the wing), and layers with a `repeat` also fill both wings with copies of themselves.
export function drawWide(target: PixelTarget, layers: Layer[], options: WideOptions): void {
    const { stageWidth, wing, height } = options;

    for (const layer of layers) {
        drawLayers(target, [layer], { x: wing, width: stageWidth, height });

        if (!layer.repeat) {
            continue;
        }
        for (let shift = layer.repeat; shift < stageWidth + wing; shift += layer.repeat) {
            drawLayers(target, [moved(layer, wing - shift)], { x: 0, width: wing, height });
            drawLayers(target, [moved(layer, shift - stageWidth)], { x: wing + stageWidth, width: wing, height });
        }
    }
}

function moved(layer: Layer, dx: number): Layer {
    return { ...layer, at: (layer.at ?? [[0, 0]]).map(([x, y]): Offset => [x + dx, y]) };
}

export function graphicsTarget(graphics: GameObjects.Graphics): PixelTarget {
    return {
        fillRect(x, y, width, height, color, alpha) {
            graphics.fillStyle(color, alpha);
            graphics.fillRect(x, y, width, height);
        }
    };
}
