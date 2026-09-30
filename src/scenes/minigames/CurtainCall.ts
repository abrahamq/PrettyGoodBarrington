// Curtain Call, the Mahaiwe rhythm game (docs/mocks/Mahaiwe.dc.html). The rules live in src/logic/curtainCall.ts,
// the song in src/audio/. Note positions and hit timing both come from the audio clock, so what you see,
// hear, and tap stay together even when frames stutter.
// Keys: Left, Down, Up, Right (or D, F, J, K). Touch: tap a lane; the outer lanes reach to the screen edges.
// Quit: [B] QUIT, or Escape, Backspace, X, or B.
import { Scene, type GameObjects, type Types } from 'phaser';
import { LANE_LEFT, LANE_WIDTH } from '../../art/stage.ts';
import { NOTE_TEXTURES, TEXTURES } from '../../art/textures.ts';
import { gameAudio, reportedLatencyMs } from '../../audio/gameAudio.ts';
import { arrangeSong } from '../../audio/openingNight.ts';
import { SongClock, performanceClockSource } from '../../audio/songClock.ts';
import { SongPlayer, playOneShot } from '../../audio/synth.ts';
import openingNight from '../../data/charts/openingNight.json';
import type { StopId } from '../../data/stops.ts';
import {
    CURTAIN_CALL, advanceCurtainCall, hitLane, newCurtainCall, parseChart, type CallEvent, type CurtainCallState, type Lane
} from '../../logic/curtainCall.ts';
import { colorNumber, type ColorName } from '../../palette.ts';
import type { MinigameResult } from '../../state/progress.ts';
import { loadSettings } from '../../state/settings.ts';
import { showBanner } from '../../ui/Banner.ts';
import { Button } from '../../ui/Button.ts';
import { Panel } from '../../ui/Panel.ts';
import { floatText } from '../../ui/Popup.ts';
import { ProgressBar } from '../../ui/ProgressBar.ts';
import { addPixelText } from '../../ui/text.ts';

interface CurtainCallData {
    stopId?: StopId;
}

const LEAD_IN_SEC = 0.5;
// Where a note's center meets its target's center.
const HIT_Y = 94;
const NOTE_TOP_Y = 26;
const NOTE_BOTTOM_Y = 118;
const SCROLL_PX_PER_MS = 0.07;
const LIT_MS = 110;
const SPARKLE_MS = 160;
const END_DELAY_MS = 2400;
const LANES: Lane[] = [0, 1, 2, 3];
// The arrow art points up; turn it for left, down, and right.
const ANGLES = [-90, 180, 0, 90];
const KEYS: Record<string, Lane> = {
    ArrowLeft: 0, ArrowDown: 1, ArrowUp: 2, ArrowRight: 3,
    KeyD: 0, KeyF: 1, KeyJ: 2, KeyK: 3
};
const QUIT_KEYS = ['Escape', 'Backspace', 'KeyX', 'KeyB'];
const JUDGMENT_TEXT: Record<CallEvent['judgment'], [string, ColorName]> = {
    great: ['GREAT!', 'gold'],
    good: ['GOOD', 'cream'],
    miss: ['MISS', 'pink']
};
const TITLE = { x: 4, y: 4, width: 68, height: 30 };
const SCORE = { x: 168, y: 4, width: 68, height: 52 };
const APPLAUSE = { x: 4, y: 136, width: 150, height: 20 };
const DEPTH = { notes: 1, targets: 2, hud: 10 };

// Tap zones: each lane, with the outer two stretched to the screen edges for easier thumbs.
const ZONES = [
    { lane: 0 as Lane, left: 0, right: LANE_LEFT + LANE_WIDTH },
    { lane: 1 as Lane, left: LANE_LEFT + LANE_WIDTH, right: LANE_LEFT + LANE_WIDTH * 2 },
    { lane: 2 as Lane, left: LANE_LEFT + LANE_WIDTH * 2, right: LANE_LEFT + LANE_WIDTH * 3 },
    { lane: 3 as Lane, left: LANE_LEFT + LANE_WIDTH * 3, right: 240 }
];

function laneCenterX(lane: Lane): number {
    return LANE_LEFT + lane * LANE_WIDTH + LANE_WIDTH / 2;
}

export class CurtainCall extends Scene {
    private state!: CurtainCallState;
    private clock!: SongClock;
    private player: SongPlayer | null = null;
    private stopId: StopId = 'mahaiwe';
    private ended = false;
    private noteImages: GameObjects.Image[] = [];
    private targets: GameObjects.Image[] = [];
    private sparkles: GameObjects.Image[] = [];
    private litUntil = [0, 0, 0, 0];
    private sparkleUntil = [0, 0, 0, 0];
    private scoreText!: GameObjects.Text;
    private comboText!: GameObjects.Text;
    private applauseBar!: ProgressBar;

    constructor() {
        super('CurtainCall');
    }

    create(data: CurtainCallData): void {
        const chart = parseChart(openingNight);

        this.stopId = data?.stopId ?? 'mahaiwe';
        this.state = newCurtainCall(chart);
        this.ended = false;
        this.litUntil = [0, 0, 0, 0];
        this.sparkleUntil = [0, 0, 0, 0];

        this.add.image(0, 0, TEXTURES.stageBackground).setOrigin(0);
        this.targets = LANES.map((lane) =>
            this.add.image(laneCenterX(lane), HIT_Y, TEXTURES.targetOff).setAngle(ANGLES[lane]).setDepth(DEPTH.targets));
        this.sparkles = LANES.map((lane) =>
            this.add.image(laneCenterX(lane), HIT_Y, TEXTURES.sparkle).setDepth(DEPTH.targets).setVisible(false));
        this.noteImages = this.state.notes.map((note) =>
            this.add.image(laneCenterX(note.lane), 0, NOTE_TEXTURES[note.lane]).setAngle(ANGLES[note.lane]).setDepth(DEPTH.notes).setVisible(false));

        this.addHud();
        this.addTapZones();
        new Button(this, 160, 137, 76, 17, '[B] QUIT', 'secondary', () => this.quit());

        this.input.addPointer(2);
        this.input.keyboard?.on('keydown', this.handleKey);
        this.startMusic(chart);
        this.events.once('shutdown', () => {
            this.player?.stop();
            this.input.keyboard?.off('keydown', this.handleKey);
        });
    }

    update(): void {
        if (this.ended) {
            return;
        }

        this.player?.update();
        const now = this.clock.nowMs();
        this.state = advanceCurtainCall(this.state, now);
        this.showEvents(this.state.events);
        this.render(now);

        if (this.state.status !== 'playing') {
            this.end();
        }
    }

    private startMusic(chart: ReturnType<typeof parseChart>): void {
        const audio = gameAudio(this);
        const offsetMs = loadSettings().audioOffsetMs;

        // Without running Web Audio (unsupported, or not unlocked yet), play silently on the page clock,
        // so the notes still move.
        if (!audio || audio.context.state !== 'running') {
            this.clock = new SongClock(performanceClockSource(), LEAD_IN_SEC, offsetMs);
            this.player = null;
            return;
        }

        this.clock = new SongClock(audio.context, LEAD_IN_SEC, offsetMs + reportedLatencyMs(audio.context));
        this.player = new SongPlayer(audio.context, audio.destination, arrangeSong(chart), this.clock.startAtSec);
    }

    // Input

    private readonly handleKey = (event: KeyboardEvent): void => {
        if (event.repeat) {
            return;
        }
        if (event.code in KEYS) {
            this.hit(KEYS[event.code], event.timeStamp);
        } else if (QUIT_KEYS.includes(event.code)) {
            this.quit();
        }
    };

    private hit(lane: Lane, eventTimeStamp: number): void {
        if (this.ended) {
            return;
        }

        this.litUntil[lane] = this.time.now + LIT_MS;
        this.state = hitLane(this.state, lane, this.clock.eventMs(eventTimeStamp));
        this.showEvents(this.state.events);
    }

    private quit(): void {
        if (!this.ended) {
            this.ended = true;
            this.finish({ stopId: this.stopId, passed: false, score: 0 });
        }
    }

    // Drawing

    private render(nowMs: number): void {
        this.state.notes.forEach((note, i) => {
            const image = this.noteImages[i];
            const y = HIT_Y - (note.timeMs - nowMs) * SCROLL_PX_PER_MS;
            const hit = note.judgment === 'great' || note.judgment === 'good';

            image.setVisible(!hit && y >= NOTE_TOP_Y && y <= NOTE_BOTTOM_Y);
            image.y = y;
            image.setAlpha(note.judgment === 'miss' ? 0.4 : 1);
        });

        LANES.forEach((lane) => {
            this.targets[lane].setTexture(this.time.now < this.litUntil[lane] ? TEXTURES.targetLit : TEXTURES.targetOff);
            this.sparkles[lane].setVisible(this.time.now < this.sparkleUntil[lane]);
        });

        this.scoreText.setText(String(this.state.score).padStart(5, '0'));
        this.comboText.setText(`x${this.state.combo}`);
        this.applauseBar.setFraction(this.state.applause / 100);
        this.applauseBar.setColor(this.state.applause >= CURTAIN_CALL.winApplause ? 'teal' : 'stageFrame');
    }

    private showEvents(events: CallEvent[]): void {
        for (const event of events) {
            const [text, color] = JUDGMENT_TEXT[event.judgment];
            floatText(this, 120, 62, text, color);
            if (event.judgment === 'great') {
                this.sparkleUntil[event.lane] = this.time.now + SPARKLE_MS;
            }
        }
    }

    // Setup

    private addHud(): void {
        new Panel(this, TITLE.x, TITLE.y, TITLE.width, TITLE.height, { shadow: true }).setDepth(DEPTH.hud);
        addPixelText(this, TITLE.x + 6, TITLE.y + 6, 'CURTAIN', 'ink').setDepth(DEPTH.hud);
        addPixelText(this, TITLE.x + 6, TITLE.y + 16, 'CALL', 'red').setDepth(DEPTH.hud);

        new Panel(this, SCORE.x, SCORE.y, SCORE.width, SCORE.height, { shadow: true }).setDepth(DEPTH.hud);
        addPixelText(this, SCORE.x + 7, SCORE.y + 6, 'SCORE', 'ink').setDepth(DEPTH.hud);
        this.scoreText = addPixelText(this, SCORE.x + 7, SCORE.y + 16, '', 'ink').setDepth(DEPTH.hud);
        addPixelText(this, SCORE.x + 7, SCORE.y + 28, 'COMBO', 'ink').setDepth(DEPTH.hud);
        this.comboText = addPixelText(this, SCORE.x + 7, SCORE.y + 38, '', 'red').setDepth(DEPTH.hud);

        new Panel(this, APPLAUSE.x, APPLAUSE.y, APPLAUSE.width, APPLAUSE.height, { shadow: true }).setDepth(DEPTH.hud);
        addPixelText(this, APPLAUSE.x + 7, APPLAUSE.y + 6, 'APPLAUSE', 'ink').setDepth(DEPTH.hud);
        const bar = { x: APPLAUSE.x + 75, y: APPLAUSE.y + 6, width: APPLAUSE.width - 82, height: 8 };
        this.applauseBar = new ProgressBar(this, bar.x, bar.y, bar.width, bar.height, 'stageFrame').setDepth(DEPTH.hud);
        // A tick at the 60% needed to win.
        const tickX = bar.x + 1 + Math.round((bar.width - 2) * (CURTAIN_CALL.winApplause / 100));
        this.add.rectangle(tickX, bar.y - 2, 1, bar.height + 4, colorNumber('ink')).setOrigin(0).setDepth(DEPTH.hud);
    }

    private addTapZones(): void {
        for (const zone of ZONES) {
            this.add.zone(zone.left, 0, zone.right - zone.left, 160).setOrigin(0).setInteractive()
                .on('pointerdown', (pointer: { event: Event }, _x: number, _y: number, event: Types.Input.EventData) => {
                    event.stopPropagation();
                    this.hit(zone.lane, pointer.event.timeStamp);
                });
        }
    }

    // Ending

    private end(): void {
        this.ended = true;
        const passed = this.state.status === 'won';

        showBanner(this, 120, 58, passed ? 'BRAVO!' : 'CURTAIN FALLS', `APPLAUSE ${this.state.applause}%`, passed ? 'teal' : 'brick');
        const audio = gameAudio(this);
        if (passed && audio) {
            playOneShot(audio.context, audio.destination, 'cheer', audio.context.currentTime);
        }

        this.time.delayedCall(END_DELAY_MS, () => this.finish({ stopId: this.stopId, passed, score: this.state.score }));
    }

    private finish(result: MinigameResult): void {
        this.player?.stop();
        this.scene.start('Overworld', { result });
    }
}
