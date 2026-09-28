// Boot scene: loads the fonts, draws the placeholder textures, applies the saved sound setting,
// then opens the Title screen. No text appears before the fonts finish loading here.
import { Scene } from 'phaser';
import { generatePlaceholderTextures } from '../art/textures.ts';
import { loadSettings } from '../state/settings.ts';
import { FONTS } from '../ui/text.ts';

export class Boot extends Scene {
    constructor() {
        super('Boot');
    }

    preload(): void {
        this.load.font(FONTS.pixel, 'assets/fonts/press-start-2p.woff2', 'woff2');
        this.load.font(FONTS.dialogue, 'assets/fonts/vt323.woff2', 'woff2');
    }

    create(): void {
        generatePlaceholderTextures(this);
        this.sound.mute = !loadSettings().sound;
        this.scene.start('Title');
    }
}
