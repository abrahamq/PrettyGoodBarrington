// The end-of-round banner the minigames show: a panel with a colored title line and a second line,
// such as "STACKED!" and "SCORE 750". Drawn above everything else in the scene.
import type { Scene } from 'phaser';
import type { ColorName } from '../palette.ts';
import { Panel } from './Panel.ts';
import { addPixelText, centeredX, pixelTextWidth } from './text.ts';

const BANNER_DEPTH = 30;

export function showBanner(scene: Scene, centerX: number, top: number, title: string, subtitle: string, titleColor: ColorName = 'brick'): void {
    const width = Math.max(120, pixelTextWidth(title) + 16, pixelTextWidth(subtitle) + 16);

    new Panel(scene, Math.round(centerX - width / 2), top, width, 32, { shadow: true }).setDepth(BANNER_DEPTH);
    addPixelText(scene, centeredX(title, centerX), top + 7, title, titleColor).setDepth(BANNER_DEPTH);
    addPixelText(scene, centeredX(subtitle, centerX), top + 17, subtitle, 'ink').setDepth(BANNER_DEPTH);
}
