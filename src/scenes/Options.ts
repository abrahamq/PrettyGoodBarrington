// Options screen: turn sound and the on-screen d-pad on or off, open the rhythm-game Calibrate screen,
// and erase the save (after a confirm step).
// Escape, Backspace, or BACK returns to the Title menu.
import { Scene } from 'phaser';
import { TEXTURES } from '../art/textures.ts';
import { CENTER_X } from '../layout.ts';
import { hasSave, resetSave } from '../state/save.ts';
import { loadSettings, saveSettings } from '../state/settings.ts';
import { Menu } from '../ui/Menu.ts';
import { addShadowedText, centeredX } from '../ui/text.ts';

const MENU_TOP = 56;

export class Options extends Scene {
    private menu?: Menu;

    constructor() {
        super('Options');
    }

    create(): void {
        this.menu = undefined;
        this.add.image(0, 0, TEXTURES.titleBackground).setOrigin(0);
        addShadowedText(this, centeredX('OPTIONS', CENTER_X, 16), 24, 'OPTIONS', 'cream', [
            { color: 'brick', offset: 2 },
            { color: 'ink', offset: 3 }
        ], 16);

        this.showOptions();
    }

    private showOptions(heading?: string[]): void {
        const settings = loadSettings();

        this.menu?.destroy();
        this.menu = new Menu(this, CENTER_X, MENU_TOP, [
            { label: switchLabel('SOUND', settings.sound), onSelect: () => this.toggleSound() },
            { label: switchLabel('D-PAD', settings.dpad), onSelect: () => this.toggleDpad() },
            { label: 'CALIBRATE', onSelect: () => this.scene.start('Calibrate') },
            { label: 'RESET SAVE', enabled: hasSave(), onSelect: () => this.confirmReset() },
            { label: 'BACK', onSelect: () => this.back() }
        ], { heading, onCancel: () => this.back() });
    }

    private toggleSound(): void {
        const settings = loadSettings();
        settings.sound = !settings.sound;
        saveSettings(settings);

        this.sound.mute = !settings.sound;
        this.menu?.setLabel(0, switchLabel('SOUND', settings.sound));
    }

    // The on-screen d-pad for touch screens; it appears in the Overworld when this is on.
    private toggleDpad(): void {
        const settings = loadSettings();
        settings.dpad = !settings.dpad;
        saveSettings(settings);

        this.menu?.setLabel(1, switchLabel('D-PAD', settings.dpad));
    }

    private confirmReset(): void {
        this.menu?.destroy();
        this.menu = new Menu(this, CENTER_X, MENU_TOP, [
            { label: 'NO', onSelect: () => this.showOptions() },
            { label: 'YES', onSelect: () => this.reset() }
        ], {
            heading: ['ERASE YOUR SAVE?', 'YOU CANNOT UNDO IT.'],
            onCancel: () => this.showOptions()
        });
    }

    private reset(): void {
        resetSave();
        this.showOptions(['SAVE ERASED.']);
    }

    private back(): void {
        this.scene.start('Title', { showMenu: true });
    }
}

// "ON" gets an extra space, so the label keeps the same width when the setting flips.
function switchLabel(name: string, on: boolean): string {
    return on ? `${name}  ON` : `${name} OFF`;
}
