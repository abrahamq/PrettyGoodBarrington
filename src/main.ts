// Entry point: the Phaser game config (a 240x160 pixel-art canvas scaled to fit the screen) and the scene list.
import { AUTO, Game, Scale } from 'phaser';
import './style.css';
import { GAME_HEIGHT, GAME_WIDTH } from './layout.ts';
import { PALETTE } from './palette.ts';
import { Boot } from './scenes/Boot.ts';
import { Options } from './scenes/Options.ts';
import { Overworld } from './scenes/Overworld.ts';
import { Title } from './scenes/Title.ts';

const config: Phaser.Types.Core.GameConfig = {
    type: AUTO,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    parent: 'game-container',
    backgroundColor: PALETTE.ink,
    pixelArt: true,
    roundPixels: true,
    scale: {
        mode: Scale.FIT,
        autoCenter: Scale.CENTER_BOTH
    },
    scene: [
        Boot,
        Title,
        Options,
        Overworld
    ]
};

new Game(config);
