// The save that is in play right now. Scenes share it through Phaser's game-wide registry.
import type { Scene } from 'phaser';
import { writeSave, type SaveData } from './save.ts';

const SESSION_KEY = 'currentSave';

export function startSession(scene: Scene, save: SaveData): void {
    scene.registry.set(SESSION_KEY, save);
}

export function currentSave(scene: Scene): SaveData {
    const save = scene.registry.get(SESSION_KEY) as SaveData | undefined;

    if (!save) {
        throw new Error('No game in progress. Start one from the Title screen.');
    }

    return save;
}

export function startGame(scene: Scene, save: SaveData): void {
    writeSave(save);
    startSession(scene, save);
    scene.scene.start('Overworld');
}
