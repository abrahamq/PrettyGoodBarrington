// Boot scene: loads the fonts, the overworld map, and the character PNGs, draws the placeholder textures, makes the
// walk animations, applies the saved sound setting, then opens the Title screen. No text appears before the fonts
// finish loading here.
import { Scene } from 'phaser';
import { CHARACTER_HEIGHT, CHARACTER_WIDTH, NPC_KEYS, playerTextureKey, spriteUrl } from '../art/people.ts';
import { createWalkAnimations, generatePlaceholderTextures } from '../art/textures.ts';
import { CHARACTER_IDS } from '../data/characters.ts';
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

        for (const character of CHARACTER_IDS) {
            const key = playerTextureKey(character);
            this.load.spritesheet(key, spriteUrl(key), { frameWidth: CHARACTER_WIDTH, frameHeight: CHARACTER_HEIGHT });
        }
        for (const key of NPC_KEYS) {
            this.load.image(key, spriteUrl(key));
        }
    }

    create(): void {
        generatePlaceholderTextures(this);
        createWalkAnimations(this);
        this.sound.mute = !loadSettings().sound;
        this.scene.start('Title');
    }
}
