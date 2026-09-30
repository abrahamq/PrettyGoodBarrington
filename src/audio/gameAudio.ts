// Finds the game's Web Audio context and its master output. Sounds sent to that output follow the
// Sound ON/OFF setting, because Phaser mutes it. Returns null in browsers without Web Audio.
import type { Scene } from 'phaser';

export interface GameAudio {
    context: AudioContext;
    destination: AudioNode;
}

export function gameAudio(scene: Scene): GameAudio | null {
    const sound = scene.sound as Partial<Phaser.Sound.WebAudioSoundManager>;

    if (!sound.context || !sound.destination) {
        return null;
    }
    if (sound.context.state === 'suspended') {
        void sound.context.resume();
    }

    return { context: sound.context, destination: sound.destination };
}

// How long after a scheduled time the sound actually reaches the speakers, as far as the browser knows.
// Not every browser reports it; the player's calibration offset covers the rest.
export function reportedLatencyMs(context: AudioContext): number {
    return ((context.baseLatency || 0) + (context.outputLatency || 0)) * 1000;
}
