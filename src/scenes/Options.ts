// Options screen: turn sound on or off, and erase the save (after a confirm step).
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
            { label: soundLabel(settings.sound), onSelect: () => this.toggleSound() },
            { label: 'RESET SAVE', enabled: hasSave(), onSelect: () => this.confirmReset() },
            { label: 'BACK', onSelect: () => this.back() }
        ], { heading, onCancel: () => this.back() });
    }

    private toggleSound(): void {
        const settings = loadSettings();
        settings.sound = !settings.sound;
        saveSettings(settings);

        this.sound.mute = !settings.sound;
        this.menu?.setLabel(0, soundLabel(settings.sound));
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

// Both labels are 9 characters, so the menu keeps the same width when the setting flips.
function soundLabel(on: boolean): string {
    return on ? 'SOUND  ON' : 'SOUND OFF';
}
