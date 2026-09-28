// A tappable button with a text label, in the mockups' two styles:
//   primary:   brick red with a darker bottom edge and cream text (for the main action, like [A] DROP)
//   secondary: cream with ink text (for [B] QUIT and other ways out)
// Both have a 1px ink border and a soft drop shadow. The tap does not reach anything underneath.
import type { GameObjects, Scene, Types } from 'phaser';
import { colorNumber, type ColorName } from '../palette.ts';
import { addPixelText, pixelTextWidth } from './text.ts';

export type ButtonStyle = 'primary' | 'secondary';

const STYLES: Record<ButtonStyle, { fill: ColorName; edge: ColorName; text: ColorName }> = {
    primary: { fill: 'brick', edge: 'brickDark', text: 'whiteCream' },
    secondary: { fill: 'cream', edge: 'parchment', text: 'ink' }
};
const EDGE = 2;
const SHADOW = 2;

export class Button {
    private readonly parts: (GameObjects.Rectangle | GameObjects.Text)[] = [];

    constructor(
        scene: Scene,
        x: number,
        y: number,
        width: number,
        height: number,
        label: string,
        style: ButtonStyle,
        onPress: () => void
    ) {
        const colors = STYLES[style];
        const textY = y + Math.round((height - EDGE - 8) / 2);

        this.parts.push(
            scene.add.rectangle(x + SHADOW, y + SHADOW, width, height, colorNumber('ink'), 0.4).setOrigin(0),
            scene.add.rectangle(x, y, width, height, colorNumber('ink')).setOrigin(0),
            scene.add.rectangle(x + 1, y + 1, width - 2, height - 2, colorNumber(colors.edge)).setOrigin(0),
            scene.add.rectangle(x + 1, y + 1, width - 2, height - 2 - EDGE, colorNumber(colors.fill)).setOrigin(0),
            addPixelText(scene, Math.round(x + (width - pixelTextWidth(label)) / 2), textY, label, colors.text)
        );

        const hitArea = this.parts[1];
        hitArea.setInteractive({ useHandCursor: true });
        hitArea.on('pointerdown', (_pointer: unknown, _x: number, _y: number, event: Types.Input.EventData) => {
            event.stopPropagation();
            onPress();
        });
    }

    setVisible(visible: boolean): void {
        for (const part of this.parts) {
            part.setVisible(visible);
        }
    }

    destroy(): void {
        for (const part of this.parts) {
            part.destroy();
        }
    }
}
