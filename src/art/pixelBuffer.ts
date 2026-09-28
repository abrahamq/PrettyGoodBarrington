// A plain RGBA pixel grid in memory. The map script paints the tileset into one and saves it as tiles.png.
import type { PixelTarget } from './paint.ts';

export interface PixelBuffer {
    width: number;
    height: number;
    // 4 bytes per pixel (red, green, blue, alpha), row by row from the top left.
    data: Uint8Array;
}

export function createPixelBuffer(width: number, height: number): PixelBuffer {
    return { width, height, data: new Uint8Array(width * height * 4) };
}

export function pixelAt(buffer: PixelBuffer, x: number, y: number): number[] {
    const i = (y * buffer.width + x) * 4;
    return Array.from(buffer.data.slice(i, i + 4));
}

export function pixelBufferTarget(buffer: PixelBuffer): PixelTarget {
    return {
        fillRect(x, y, width, height, color, alpha) {
            for (let row = y; row < y + height; row++) {
                for (let col = x; col < x + width; col++) {
                    blendPixel(buffer, col, row, color, alpha);
                }
            }
        }
    };
}

// Standard "source over" blending, so a half-transparent shadow darkens what is under it.
function blendPixel(buffer: PixelBuffer, x: number, y: number, color: number, alpha: number): void {
    if (x < 0 || y < 0 || x >= buffer.width || y >= buffer.height) {
        return;
    }

    const i = (y * buffer.width + x) * 4;
    const under = buffer.data[i + 3] / 255;
    const outAlpha = alpha + under * (1 - alpha);
    const channels = [(color >> 16) & 0xff, (color >> 8) & 0xff, color & 0xff];

    channels.forEach((value, c) => {
        const mixed = outAlpha === 0 ? 0 : (value * alpha + buffer.data[i + c] * under * (1 - alpha)) / outAlpha;
        buffer.data[i + c] = Math.round(mixed);
    });
    buffer.data[i + 3] = Math.round(outAlpha * 255);
}
