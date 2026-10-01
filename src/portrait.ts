// Phones play in landscape. When a phone is upright, index.html shows a "turn your phone" notice
// (style.css decides when), and this pauses the game and its sound until the phone turns back.
import type { Game } from 'phaser';

const UPRIGHT_PHONE = '(orientation: portrait) and (pointer: coarse)';

export function pauseWhileUpright(game: Game): void {
    const upright = window.matchMedia(UPRIGHT_PHONE);
    // Suspending the audio clock also holds Curtain Call's song time, so notes stay in sync after a pause.
    const audio = (game.sound as Partial<Phaser.Sound.WebAudioSoundManager>).context;

    const apply = (): void => {
        if (upright.matches) {
            game.pause();
            audio?.suspend().catch(() => undefined);
        } else {
            game.resume();
            audio?.resume().catch(() => undefined);
        }
    };

    apply();
    upright.addEventListener('change', apply);
}
