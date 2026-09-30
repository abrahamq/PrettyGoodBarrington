// Entry point: the Phaser game config (a 240x160 pixel-art canvas scaled to fit the screen) and the scene list.
import { AUTO, Game, Scale } from 'phaser';
import './style.css';
import { GAME_HEIGHT, GAME_WIDTH } from './layout.ts';
import { PALETTE } from './palette.ts';
import { Boot } from './scenes/Boot.ts';
import { Calibrate } from './scenes/Calibrate.ts';
import { CurtainCall } from './scenes/minigames/CurtainCall.ts';
import { OrderUp } from './scenes/minigames/OrderUp.ts';
import { ScoopStack } from './scenes/minigames/ScoopStack.ts';
import { Options } from './scenes/Options.ts';
import { Overworld } from './scenes/Overworld.ts';
import { Title } from './scenes/Title.ts';
import { UI } from './scenes/UI.ts';

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
        Calibrate,
        Overworld,
        UI,
        ScoopStack,
        OrderUp,
        CurtainCall
    ]
};

const game = new Game(config);

// Dev builds only: lets you inspect the running game from the browser console as `game`.
if (import.meta.env.DEV) {
    (window as unknown as { game: Game }).game = game;
}
