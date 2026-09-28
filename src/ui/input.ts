// Input helpers shared by scenes.
import type { Scene } from 'phaser';

// Calls `callback` once, on the first key release or tap release. Waiting for the release
// (not the press) means the same press cannot also pick an item in a menu that opens in response.
export function onFirstInput(scene: Scene, callback: () => void): void {
    const keyboard = scene.input.keyboard;

    const finish = (): void => {
        keyboard?.off('keyup', finish);
        scene.input.off('pointerup', finish);
        callback();
    };

    keyboard?.once('keyup', finish);
    scene.input.once('pointerup', finish);
}
