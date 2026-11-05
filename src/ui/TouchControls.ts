// The on-screen controls for touch screens: a joystick at the bottom left and an A button at the bottom right.
// Drag the knob to walk; tap A to talk to whoever you face. A second finger can tap A while the thumb walks.
import { Geom, type GameObjects, type Input, type Scene, type Types } from 'phaser';
import { TEXTURES } from '../art/textures.ts';
import type { Direction } from '../logic/grid.ts';
import { knobOffset, stickDirection } from '../logic/joystick.ts';
import { colorNumber } from '../palette.ts';
import { addPixelText } from './text.ts';

const STICK = { x: 24, y: 134, grabRadius: 26, travel: 11 };
const ACTION = { x: 214, y: 118, size: 22 };

type Part = GameObjects.GameObject & GameObjects.Components.Visible;

export class TouchControls {
    direction: Direction | null = null;
    private actionQueued = false;
    private grip: number | null = null;
    private shown = true;
    private readonly base: GameObjects.Image;
    private readonly knob: GameObjects.Image;
    private readonly parts: Part[] = [];
    private readonly scene: Scene;

    constructor(scene: Scene) {
        this.scene = scene;
        this.base = scene.add.image(STICK.x, STICK.y, TEXTURES.stickBase).setAlpha(0.7);
        this.knob = scene.add.image(STICK.x, STICK.y, TEXTURES.stickKnob).setAlpha(0.9);
        const grab = scene.add.zone(STICK.x, STICK.y, STICK.grabRadius * 2, STICK.grabRadius * 2)
            .setInteractive(new Geom.Circle(STICK.grabRadius, STICK.grabRadius, STICK.grabRadius), Geom.Circle.Contains);
        grab.on('pointerdown', (pointer: Input.Pointer, _x: number, _y: number, event: Types.Input.EventData) => {
            if (!this.shown || this.grip !== null) {
                return;
            }
            event.stopPropagation();
            this.grip = pointer.id;
            this.follow(pointer);
        });

        const action = scene.add.rectangle(ACTION.x, ACTION.y, ACTION.size, ACTION.size, colorNumber('ink'), 0.7)
            .setOrigin(0)
            .setInteractive();
        action.on('pointerdown', (_pointer: unknown, _x: number, _y: number, event: Types.Input.EventData) => {
            event.stopPropagation();
            this.actionQueued = true;
        });

        this.parts.push(this.base, this.knob, grab, action, addPixelText(scene, ACTION.x + 7, ACTION.y + 7, 'A', 'cream'));

        scene.input.on('pointermove', this.handleMove);
        scene.input.on('pointerup', this.handleUp);
        scene.input.on('pointerupoutside', this.handleUp);
        scene.events.once('shutdown', () => {
            scene.input.off('pointermove', this.handleMove);
            scene.input.off('pointerup', this.handleUp);
            scene.input.off('pointerupoutside', this.handleUp);
        });
    }

    // Returns true once per tap of the A button.
    takeAction(): boolean {
        const queued = this.actionQueued;
        this.actionQueued = false;
        return queued;
    }

    setVisible(visible: boolean): void {
        if (visible === this.shown) {
            return;
        }
        this.shown = visible;
        for (const part of this.parts) {
            part.setVisible(visible);
        }
        if (!visible) {
            this.letGo();
        }
    }

    private readonly handleMove = (pointer: Input.Pointer): void => {
        if (pointer.id === this.grip) {
            this.follow(pointer);
        }
    };

    private readonly handleUp = (pointer: Input.Pointer): void => {
        if (pointer.id === this.grip) {
            this.letGo();
        }
    };

    // Reads the pointer through this scene's camera, so the offset stays right when the camera scrolls.
    private follow(pointer: Input.Pointer): void {
        const point = this.scene.cameras.main.getWorldPoint(pointer.x, pointer.y);
        const dx = point.x - this.base.x;
        const dy = point.y - this.base.y;
        const knob = knobOffset(dx, dy, STICK.travel);

        this.knob.setPosition(this.base.x + knob.x, this.base.y + knob.y);
        this.direction = stickDirection(dx, dy, this.direction);
    }

    private letGo(): void {
        this.grip = null;
        this.direction = null;
        this.knob.setPosition(this.base.x, this.base.y);
    }
}
