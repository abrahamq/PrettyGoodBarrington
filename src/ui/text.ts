// Text helpers. All in-canvas text uses the Press Start 2P pixel font at 8px (16px for big titles),
// so each glyph pixel lands on whole game pixels. The font is monospaced: each character is `size` pixels wide.
import type { GameObjects, Scene } from 'phaser';
import { colorHex, type ColorName } from '../palette.ts';

export const FONTS = {
    pixel: 'PressStart2P',
    dialogue: 'VT323'
} as const;

export type PixelSize = 8 | 16;

export interface TextShadow {
    color: ColorName;
    offset: number;
}

export function addPixelText(
    scene: Scene,
    x: number,
    y: number,
    text: string,
    color: ColorName,
    size: PixelSize = 8
): GameObjects.Text {
    return scene.add.text(x, y, text, {
        fontFamily: FONTS.pixel,
        fontSize: `${size}px`,
        color: colorHex(color)
    });
}

export function pixelTextWidth(text: string, size: PixelSize = 8): number {
    return text.length * size;
}

// Left x that centers the text on centerX, rounded to a whole pixel.
export function centeredX(text: string, centerX: number, size: PixelSize = 8): number {
    return Math.round(centerX - pixelTextWidth(text, size) / 2);
}

// Draws hard drop shadows first (farthest first), then the text itself on top.
export function addShadowedText(
    scene: Scene,
    x: number,
    y: number,
    text: string,
    color: ColorName,
    shadows: TextShadow[],
    size: PixelSize = 8
): GameObjects.Text {
    const farthestFirst = [...shadows].sort((a, b) => b.offset - a.offset);

    for (const shadow of farthestFirst) {
        addPixelText(scene, x + shadow.offset, y + shadow.offset, text, shadow.color, size);
    }

    return addPixelText(scene, x, y, text, color, size);
}
