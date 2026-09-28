// The optional on-screen controls for touch screens (turn them on in Options): a d-pad at the bottom left
// and an A button at the bottom right. Hold a direction to walk; tap A to talk to whoever you face.
// Each button is 16 game pixels or larger, so it is easy to hit with a thumb.
import type { GameObjects, Scene, Types } from 'phaser';
import { TEXTURES } from '../art/textures.ts';
import type { Direction } from '../logic/grid.ts';
import { colorNumber } from '../palette.ts';
import { addPixelText } from './text.ts';

const BUTTON = 16;
const PAD = { x: 4, y: 104 };
const ACTION = { x: 214, y: 118, size: 22 };
const ROTATION: Record<Direction, number> = { up: 0, right: Math.PI / 2, down: Math.PI, left: -Math.PI / 2 };
const PLACE: Record<Direction, [number, number]> = {
    up: [BUTTON, 0],
    left: [0, BUTTON],
    right: [BUTTON * 2, BUTTON],
    down: [BUTTON, BUTTON * 2]
};

type PointerHandler = (pointer: unknown, x: number, y: number, event: Types.Input.EventData) => void;

export class TouchControls {
    direction: Direction | null = null;
    private actionQueued = false;
    private readonly parts: (GameObjects.Rectangle | GameObjects.Image | GameObjects.Text)[] = [];

    constructor(scene: Scene) {
        for (const direction of Object.keys(PLACE) as Direction[]) {
            const [dx, dy] = PLACE[direction];
            const button = this.addButton(scene, PAD.x + dx, PAD.y + dy, BUTTON);

            button.on('pointerdown', this.stopThen(() => { this.direction = direction; }));
            button.on('pointerout', () => this.release(direction));
            button.on('pointerup', () => this.release(direction));

            const arrow = scene.add.image(PAD.x + dx + BUTTON / 2, PAD.y + dy + BUTTON / 2, TEXTURES.arrow);
            this.parts.push(arrow.setRotation(ROTATION[direction]));
        }

        const action = this.addButton(scene, ACTION.x, ACTION.y, ACTION.size);
        action.on('pointerdown', this.stopThen(() => { this.actionQueued = true; }));
        this.parts.push(addPixelText(scene, ACTION.x + 7, ACTION.y + 7, 'A', 'cream'));

        scene.input.on('pointerup', () => { this.direction = null; });
    }

    // Returns true once per tap of the A button.
    takeAction(): boolean {
        const queued = this.actionQueued;
        this.actionQueued = false;
        return queued;
    }

    setVisible(visible: boolean): void {
        for (const part of this.parts) {
            part.setVisible(visible);
        }
        if (!visible) {
            this.direction = null;
        }
    }

    private addButton(scene: Scene, x: number, y: number, size: number): GameObjects.Rectangle {
        const button = scene.add.rectangle(x, y, size, size, colorNumber('ink'), 0.7).setOrigin(0).setInteractive();
        this.parts.push(button);
        return button;
    }

    private release(direction: Direction): void {
        if (this.direction === direction) {
            this.direction = null;
        }
    }

    private stopThen(action: () => void): PointerHandler {
        return (_pointer, _x, _y, event) => {
            event.stopPropagation();
            action();
        };
    }
}
