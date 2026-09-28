// A short message that rises and fades out, like "+$2.75" or "WRONG!", with a 1px ink shadow so it reads
// on any background. It removes itself when done.
import type { Scene } from 'phaser';
import type { ColorName } from '../palette.ts';
import { addPixelText, centeredX } from './text.ts';

const POPUP_DEPTH = 25;
const RISE = 10;
const DURATION_MS = 900;

export function floatText(scene: Scene, centerX: number, y: number, text: string, color: ColorName): void {
    const x = centeredX(text, centerX);
    const shadow = addPixelText(scene, x + 1, y + 1, text, 'ink').setDepth(POPUP_DEPTH);
    const label = addPixelText(scene, x, y, text, color).setDepth(POPUP_DEPTH);

    scene.tweens.add({
        targets: [shadow, label],
        y: `-=${RISE}`,
        alpha: 0,
        duration: DURATION_MS,
        ease: 'Cubic.easeIn',
        onComplete: () => {
            shadow.destroy();
            label.destroy();
        }
    });
}
