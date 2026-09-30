// A tiny Web Audio synthesizer for the generated music: drums from noise and quick pitch sweeps, and simple
// oscillator voices for bass, chords, and lead. SongPlayer schedules a song's events a little ahead of the
// audio clock each frame, so timing stays exact even when frames are late.
import type { SoundEvent, SoundKind } from './openingNight.ts';

const LOOKAHEAD_SEC = 0.25;
const TOO_LATE_SEC = 0.05;
const SILENT = 0.0001;

export class SongPlayer {
    private readonly context: AudioContext;
    private readonly output: GainNode;
    private readonly noise: AudioBuffer;
    private readonly events: SoundEvent[];
    private readonly startAtSec: number;
    private next = 0;

    // `events` must be sorted by time. `destination` should be the game's master node, so muting works.
    constructor(context: AudioContext, destination: AudioNode, events: SoundEvent[], startAtSec: number) {
        this.context = context;
        this.events = events;
        this.startAtSec = startAtSec;
        this.noise = noiseBuffer(context);
        this.output = context.createGain();
        this.output.connect(destination);
    }

    // Call once per frame. Schedules every event that starts within the next quarter second.
    update(): void {
        const horizon = this.context.currentTime + LOOKAHEAD_SEC;

        while (this.next < this.events.length) {
            const event = this.events[this.next];
            const atSec = this.startAtSec + event.timeMs / 1000;

            if (atSec > horizon) {
                break;
            }
            // After a long stall, skip what is already past rather than playing it all at once.
            if (atSec >= this.context.currentTime - TOO_LATE_SEC) {
                playSound(this.context, this.output, this.noise, event.kind, event.frequencies, event.durationMs / 1000, atSec);
            }
            this.next += 1;
        }
    }

    stop(): void {
        this.next = this.events.length;
        this.output.disconnect();
    }
}

// Plays one sound on its own (for example, the calibration metronome, or the crowd cheering).
export function playOneShot(context: AudioContext, destination: AudioNode, kind: SoundKind | 'cheer', atSec: number): void {
    const noise = noiseBuffer(context);

    if (kind === 'cheer') {
        cheer(context, destination, noise, atSec);
    } else {
        playSound(context, destination, noise, kind, [], 0, atSec);
    }
}

function playSound(
    context: AudioContext,
    out: AudioNode,
    noise: AudioBuffer,
    kind: SoundKind,
    frequencies: number[],
    durationSec: number,
    at: number
): void {
    switch (kind) {
        case 'kick': {
            const osc = context.createOscillator();
            osc.frequency.setValueAtTime(150, at);
            osc.frequency.exponentialRampToValueAtTime(45, at + 0.12);
            voice(context, out, osc, at, 0.9, 0.18);
            break;
        }
        case 'snare':
            noiseHit(context, out, noise, at, 1200, 0.35, 0.13);
            break;
        case 'hat':
            noiseHit(context, out, noise, at, 7000, 0.1, 0.04);
            break;
        case 'crash':
            noiseHit(context, out, noise, at, 3000, 0.3, Math.max(durationSec, 1.2));
            break;
        case 'click': {
            const osc = context.createOscillator();
            osc.type = 'square';
            osc.frequency.value = 1600;
            voice(context, out, osc, at, 0.12, 0.03);
            break;
        }
        case 'bass':
            tone(context, out, 'triangle', frequencies[0], at, 0.35, durationSec);
            break;
        case 'chord':
            frequencies.forEach((frequency) => tone(context, out, 'triangle', frequency, at, 0.06, durationSec));
            break;
        case 'lead':
            tone(context, out, 'square', frequencies[0], at, 0.07, durationSec);
            break;
    }
}

function tone(context: AudioContext, out: AudioNode, type: OscillatorType, frequency: number, at: number, peak: number, durationSec: number): void {
    const osc = context.createOscillator();
    osc.type = type;
    osc.frequency.value = frequency;
    voice(context, out, osc, at, peak, durationSec);
}

// Starts a sound source through a quick attack and a smooth fade, then stops it.
function voice(context: AudioContext, out: AudioNode, source: AudioScheduledSourceNode, at: number, peak: number, durationSec: number): void {
    const gain = context.createGain();
    gain.gain.setValueAtTime(SILENT, at);
    gain.gain.linearRampToValueAtTime(peak, at + 0.005);
    gain.gain.exponentialRampToValueAtTime(SILENT, at + durationSec);
    source.connect(gain);
    gain.connect(out);
    source.start(at);
    source.stop(at + durationSec + 0.05);
}

function noiseHit(context: AudioContext, out: AudioNode, noise: AudioBuffer, at: number, highpassHz: number, peak: number, durationSec: number): void {
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    source.buffer = noise;
    filter.type = 'highpass';
    filter.frequency.value = highpassHz;
    source.connect(filter);
    const gain = context.createGain();
    gain.gain.setValueAtTime(SILENT, at);
    gain.gain.linearRampToValueAtTime(peak, at + 0.002);
    gain.gain.exponentialRampToValueAtTime(SILENT, at + durationSec);
    filter.connect(gain);
    gain.connect(out);
    source.start(at);
    source.stop(at + durationSec + 0.05);
}

// Band-passed noise that swells and fades: close enough to a crowd clapping.
function cheer(context: AudioContext, out: AudioNode, noise: AudioBuffer, at: number): void {
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    source.buffer = noise;
    source.loop = true;
    filter.type = 'bandpass';
    filter.frequency.value = 1500;
    filter.Q.value = 0.7;
    gain.gain.setValueAtTime(SILENT, at);
    gain.gain.linearRampToValueAtTime(0.25, at + 0.4);
    gain.gain.exponentialRampToValueAtTime(SILENT, at + 2.4);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(out);
    source.start(at);
    source.stop(at + 2.5);
}

function noiseBuffer(context: AudioContext): AudioBuffer {
    const buffer = context.createBuffer(1, context.sampleRate, context.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < data.length; i++) {
        data[i] = Math.random() * 2 - 1;
    }

    return buffer;
}
