// Entry point: the Phaser game config (a 240x160 pixel-art canvas scaled to fit the screen) and the scene list.
import { AUTO, Game, Scale } from 'phaser';
import './style.css';
import { PALETTE } from './palette.js';
import { Boot } from './scenes/Boot.js';

const config = {
    type: AUTO,
    width: 240,
    height: 160,
    parent: 'game-container',
    backgroundColor: PALETTE.ink,
    pixelArt: true,
    roundPixels: true,
    scale: {
        mode: Scale.FIT,
        autoCenter: Scale.CENTER_BOTH
    },
    scene: [
        Boot
    ]
};

new Game(config);
