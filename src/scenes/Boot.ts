// Boot scene: loads the fonts and the overworld map, draws the placeholder textures, applies the saved sound setting,
// then opens the Title screen. No text appears before the fonts finish loading here.
import { Scene } from 'phaser';
import { generatePlaceholderTextures } from '../art/textures.ts';
import { MAP_KEY, MAP_URL } from '../map/files.ts';
import { loadSettings } from '../state/settings.ts';
import { FONTS } from '../ui/text.ts';

export class Boot extends Scene {
    constructor() {
        super('Boot');
    }

    preload(): void {
        this.load.font(FONTS.pixel, 'assets/fonts/press-start-2p.woff2', 'woff2');
        this.load.font(FONTS.dialogue, 'assets/fonts/vt323.woff2', 'woff2');
        this.load.tilemapTiledJSON(MAP_KEY, MAP_URL);
    }

    create(): void {
        generatePlaceholderTextures(this);
        this.sound.mute = !loadSettings().sound;
        this.scene.start('Title');
    }
}
