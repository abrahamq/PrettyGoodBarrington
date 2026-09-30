// Calibrate screen (opened from Options): lines up Curtain Call's timing with what the player hears.
// A click plays on every beat, and the gold arrow flashes on the beat as shifted by the current offset.
// Tap anywhere (or press Space) on each click: the screen shows how late the taps land on average, and USE
// saves that as the offset. Or nudge it by 10 ms with -10 and +10 (or Left and Right). Changes save at once.
// DONE, Escape, Backspace, or B goes back to Options.
import { Scene, type GameObjects, type Input } from 'phaser';
import { TEXTURES } from '../art/textures.ts';
import { gameAudio, reportedLatencyMs } from '../audio/gameAudio.ts';
import type { SoundEvent } from '../audio/openingNight.ts';
import { SongClock, performanceClockSource } from '../audio/songClock.ts';
import { SongPlayer } from '../audio/synth.ts';
import { CENTER_X } from '../layout.ts';
import { clampOffset, loadSettings, saveSettings } from '../state/settings.ts';
import { Button } from '../ui/Button.ts';
import { Panel } from '../ui/Panel.ts';
import { addPixelText, centeredX } from '../ui/text.ts';

const BEAT_MS = 600;
const METRONOME_BEATS = 300;
const LEAD_IN_SEC = 0.5;
const FLASH_MS = 70;
const TAPS_KEPT = 8;
// Taps further than this from a click are not real attempts, so they are ignored.
const IGNORE_TAP_MS = 250;
const STEP_MS = 10;
const TAP_KEYS = ['Space', 'Enter', 'NumpadEnter', 'KeyZ', 'KeyA'];
const BACK_KEYS = ['Escape', 'Backspace', 'KeyB'];

export class Calibrate extends Scene {
    private clock!: SongClock;
    private player: SongPlayer | null = null;
    private offsetMs = 0;
    private taps: number[] = [];
    private target!: GameObjects.Image;
    private offsetText!: GameObjects.Text;
    private tapsText!: GameObjects.Text;

    constructor() {
        super('Calibrate');
    }

    create(): void {
        this.offsetMs = loadSettings().audioOffsetMs;
        this.taps = [];

        this.add.image(0, 0, TEXTURES.titleBackground).setOrigin(0);
        new Panel(this, 14, 8, 212, 108, { shadow: true });
        this.addCentered('CALIBRATE', 15, 'red');
        this.addCentered('TAP ON EACH CLICK', 27, 'ink');
        this.offsetText = addPixelText(this, 0, 43, '', 'ink');
        this.tapsText = addPixelText(this, 0, 55, '', 'wood');
        this.target = this.add.image(CENTER_X, 88, TEXTURES.targetOff).setScale(2);

        new Button(this, 14, 124, 44, 18, '-10', 'secondary', () => this.nudge(-STEP_MS));
        new Button(this, 62, 124, 44, 18, '+10', 'secondary', () => this.nudge(STEP_MS));
        new Button(this, 110, 124, 52, 18, 'USE', 'primary', () => this.useTaps());
        new Button(this, 166, 124, 60, 18, 'DONE', 'secondary', () => this.scene.start('Options'));

        this.input.keyboard?.on('keydown', this.handleKey);
        this.input.on('pointerdown', this.handleTap);
        this.startMetronome();
        this.events.once('shutdown', () => {
            this.player?.stop();
            this.input.keyboard?.off('keydown', this.handleKey);
            this.input.off('pointerdown', this.handleTap);
        });

        this.showNumbers();
    }

    update(): void {
        this.player?.update();

        // The flash follows the offset, so when it is right, the flash and the click happen together.
        const shifted = this.clock.nowMs() - this.offsetMs;
        const sinceBeat = ((shifted % BEAT_MS) + BEAT_MS) % BEAT_MS;
        this.target.setTexture(shifted >= 0 && sinceBeat < FLASH_MS ? TEXTURES.targetLit : TEXTURES.targetOff);
    }

    // The clock here leaves out the player's offset, so taps measure how far off they really are.
    private startMetronome(): void {
        const audio = gameAudio(this);
        const clicks: SoundEvent[] = Array.from({ length: METRONOME_BEATS }, (_, beat) => ({
            timeMs: beat * BEAT_MS, kind: 'click', frequencies: [], durationMs: 0
        }));

        if (!audio || audio.context.state !== 'running') {
            this.clock = new SongClock(performanceClockSource(), LEAD_IN_SEC, 0);
            this.player = null;
            return;
        }

        this.clock = new SongClock(audio.context, LEAD_IN_SEC, reportedLatencyMs(audio.context));
        this.player = new SongPlayer(audio.context, audio.destination, clicks, this.clock.startAtSec);
    }

    private readonly handleKey = (event: KeyboardEvent): void => {
        if (event.repeat) {
            return;
        }
        if (TAP_KEYS.includes(event.code)) {
            this.recordTap(event.timeStamp);
        } else if (event.code === 'ArrowLeft') {
            this.nudge(-STEP_MS);
        } else if (event.code === 'ArrowRight') {
            this.nudge(STEP_MS);
        } else if (BACK_KEYS.includes(event.code)) {
            this.scene.start('Options');
        }
    };

    private readonly handleTap = (pointer: Input.Pointer, tappedObjects: GameObjects.GameObject[]): void => {
        if (tappedObjects.length === 0) {
            this.recordTap(pointer.event.timeStamp);
        }
    };

    private recordTap(eventTimeStamp: number): void {
        const tapMs = this.clock.eventMs(eventTimeStamp);
        const delta = tapMs - Math.round(tapMs / BEAT_MS) * BEAT_MS;

        if (tapMs < 0 || Math.abs(delta) > IGNORE_TAP_MS) {
            return;
        }

        this.taps = [...this.taps, delta].slice(-TAPS_KEPT);
        this.showNumbers();
    }

    private nudge(stepMs: number): void {
        this.setOffset(this.offsetMs + stepMs);
    }

    private useTaps(): void {
        if (this.taps.length > 0) {
            this.setOffset(Math.round(average(this.taps) / STEP_MS) * STEP_MS);
        }
    }

    private setOffset(offsetMs: number): void {
        this.offsetMs = clampOffset(offsetMs);
        saveSettings({ ...loadSettings(), audioOffsetMs: this.offsetMs });
        this.showNumbers();
    }

    private showNumbers(): void {
        const offset = `OFFSET ${signed(this.offsetMs)} MS`;
        const taps = this.taps.length > 0 ? `YOUR TAPS ${signed(Math.round(average(this.taps)))} MS` : 'YOUR TAPS --';

        this.offsetText.setText(offset).setX(centeredX(offset, CENTER_X));
        this.tapsText.setText(taps).setX(centeredX(taps, CENTER_X));
    }

    private addCentered(text: string, y: number, color: 'red' | 'ink'): void {
        addPixelText(this, centeredX(text, CENTER_X), y, text, color);
    }
}

function average(values: number[]): number {
    return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function signed(value: number): string {
    return value > 0 ? `+${value}` : String(value);
}
