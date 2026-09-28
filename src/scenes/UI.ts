// UI scene: runs on top of the Overworld and holds the HUD (street name, clock and stamp count,
// the Passport button), the dialogue box, and the optional on-screen d-pad.
// The Overworld asks it to show dialogue and checks isBusy() before it moves the player.
import { Scene, type Types } from 'phaser';
import { TEXTURES } from '../art/textures.ts';
import { clockText } from '../logic/clock.ts';
import type { Direction } from '../logic/grid.ts';
import { colorNumber } from '../palette.ts';
import { stampCount } from '../state/progress.ts';
import { currentSave } from '../state/session.ts';
import { loadSettings } from '../state/settings.ts';
import { DialogueBox, type DialogueRequest } from '../ui/DialogueBox.ts';
import { Panel } from '../ui/Panel.ts';
import { TouchControls } from '../ui/TouchControls.ts';
import { addPixelText, centeredX } from '../ui/text.ts';

const LOCATION = { x: 4, y: 4, width: 102, height: 20 };
const CLOCK = { x: 134, y: 4, width: 102, height: 30 };
const PASSPORT = { x: 134, y: 36, width: 102, height: 12, label: '[P] PASSPORT' };

export class UI extends Scene {
    private dialogue?: DialogueBox;
    private controls?: TouchControls;
    private locationText!: Phaser.GameObjects.Text;
    private clockLabel!: Phaser.GameObjects.Text;
    private stampLabel!: Phaser.GameObjects.Text;

    constructor() {
        super('UI');
    }

    create(): void {
        this.dialogue = undefined;
        this.controls = undefined;

        new Panel(this, LOCATION.x, LOCATION.y, LOCATION.width, LOCATION.height, { shadow: true });
        this.locationText = addPixelText(this, LOCATION.x + 7, LOCATION.y + 6, '', 'ink');

        new Panel(this, CLOCK.x, CLOCK.y, CLOCK.width, CLOCK.height, { shadow: true });
        this.clockLabel = addPixelText(this, CLOCK.x + 7, CLOCK.y + 6, '', 'ink');
        this.add.image(CLOCK.x + 7, CLOCK.y + 16, TEXTURES.stamp).setOrigin(0);
        this.stampLabel = addPixelText(this, CLOCK.x + 21, CLOCK.y + 17, '', 'ink');

        this.addPassportButton();

        if (loadSettings().dpad) {
            this.controls = new TouchControls(this);
        }
        this.dialogue = new DialogueBox(this);
        this.refreshClock();
    }

    update(_time: number, deltaMs: number): void {
        this.dialogue?.update(deltaMs);
        this.controls?.setVisible(!this.isBusy());
        this.refreshClock();
    }

    isBusy(): boolean {
        return this.dialogue?.isOpen ?? false;
    }

    showDialogue(request: DialogueRequest): void {
        this.dialogue?.open(request);
    }

    showPassport(): void {
        const count = stampCount(currentSave(this));

        this.showDialogue({
            speaker: 'PASSPORT',
            paragraphs: [`You have ${count} of 8 stamps. The full passport opens in a later update.`]
        });
    }

    setLocation(label: string): void {
        this.locationText?.setText(label);
    }

    touchDirection(): Direction | null {
        return this.controls?.direction ?? null;
    }

    takeTouchAction(): boolean {
        return this.controls?.takeAction() ?? false;
    }

    private addPassportButton(): void {
        const { x, y, width, height, label } = PASSPORT;

        this.add.rectangle(x + 2, y + 2, width, height, colorNumber('ink'), 0.5).setOrigin(0);
        this.add.rectangle(x, y, width, height, colorNumber('ink')).setOrigin(0)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', (_pointer: unknown, _x: number, _y: number, event: Types.Input.EventData) => {
                event.stopPropagation();
                if (!this.isBusy()) {
                    this.showPassport();
                }
            });
        addPixelText(this, centeredX(label, x + width / 2), y + 2, label, 'cream');
    }

    private refreshClock(): void {
        const save = currentSave(this);
        const time = clockText(save.dayMinutes);
        const stamps = `${stampCount(save)}/8`;

        if (this.clockLabel.text !== time) {
            this.clockLabel.setText(time);
        }
        if (this.stampLabel.text !== stamps) {
            this.stampLabel.setText(stamps);
        }
    }
}
