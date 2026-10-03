// Trim the GB, Jack's side game on the town lawn. The rules live in src/logic/hedgeTrim.ts and the hedge art in
// src/art/hedge.ts; this scene passes on strokes, repaints the hedge when it changes, and shows the score.
// Trim: drag a finger or the mouse along the letters. Or, with a keyboard, steer the clippers with the arrow keys
// or WASD (they cut wherever they go).
// Quit: tap [B] QUIT, or press Escape, Backspace, X, or B. Quitting scores nothing.
import { Scene, type GameObjects, type Input, type Textures } from 'phaser';
import { paintHedge } from '../../art/hedge.ts';
import { TEXTURES } from '../../art/textures.ts';
import type { Direction } from '../../logic/grid.ts';
import {
    GUIDE_POINTS, HEDGE_TRIM, aim, neatness, newHedgeTrim, scoreFor, timeLeftMs, traceStroke, updateHedgeTrim,
    type HedgeTrimState, type Point
} from '../../logic/hedgeTrim.ts';
import { GAME_HEIGHT, GAME_WIDTH } from '../../layout.ts';
import { colorNumber, type ColorName } from '../../palette.ts';
import type { SideGameResult } from '../../state/progress.ts';
import { currentSave } from '../../state/session.ts';
import { Button } from '../../ui/Button.ts';
import { Panel } from '../../ui/Panel.ts';
import { ProgressBar } from '../../ui/ProgressBar.ts';
import { addPixelText, centeredX, pixelTextWidth } from '../../ui/text.ts';

const HEDGE_TEXTURE = 'hedge-live';
const MAX_FRAME_MS = 100;
const END_DELAY_MS = 3200;
const LOW_TIME_MS = 10_000;
// Keyboard clippers speed, in game pixels per second.
const KEY_SPEED = 60;
const MAX_LEAVES = 60;
const QUIT_KEYS = ['Escape', 'Backspace', 'KeyX', 'KeyB'];

const DEPTH = { hedge: 1, leaves: 2, clippers: 3, hud: 10, results: 30 };

const TITLE = { x: 4, y: 4, width: 102, height: 31 };
const STATS = { x: 148, y: 4, width: 88, height: 31 };
const TIP = { x: 4, y: 148 };

export class HedgeTrim extends Scene {
    private state!: HedgeTrimState;
    private ended = false;
    private canvas!: Textures.CanvasTexture;
    private pixels!: ImageData;
    private paintedCount = -1;
    private clippers!: GameObjects.Image;
    private activePointer: number | null = null;
    private lastPoint: Point | null = null;
    private keyboardPoint: Point | null = null;
    private keys!: Record<Direction, Input.Keyboard.Key[]>;
    private leaves = 0;
    private hud: { setVisible(visible: boolean): unknown }[] = [];
    private timeBar!: ProgressBar;
    private neatText!: GameObjects.Text;
    private aimText!: GameObjects.Text;
    private tipTexts: GameObjects.Text[] = [];

    constructor() {
        super('HedgeTrim');
    }

    create(): void {
        this.state = newHedgeTrim();
        this.ended = false;
        this.paintedCount = -1;
        this.activePointer = null;
        this.lastPoint = null;
        this.keyboardPoint = null;
        this.leaves = 0;
        this.hud = [];
        this.tipTexts = [];

        this.add.image(0, 0, TEXTURES.lawnBackground).setOrigin(0);
        this.createHedgeCanvas();
        this.clippers = this.add.image(0, 0, TEXTURES.clippers).setOrigin(4 / 9).setDepth(DEPTH.clippers).setVisible(false);

        this.addTitlePanel();
        this.addStatsPanel();
        this.addTip();
        const quit = new Button(this, 164, 142, 72, 14, '[B] QUIT', 'secondary', () => this.quit());
        this.hud.push(quit);

        this.setUpInput();
        this.render();
    }

    update(_time: number, deltaMs: number): void {
        if (this.ended) {
            return;
        }

        const frameMs = Math.min(deltaMs, MAX_FRAME_MS);
        this.moveKeyboardClippers(frameMs);
        this.state = updateHedgeTrim(this.state, frameMs);
        this.render();

        if (this.state.status === 'won' || this.state.status === 'lost') {
            this.end();
        }
    }

    // Input

    private setUpInput(): void {
        const keyboard = this.input.keyboard;
        const keysFor = (...codes: string[]) =>
            codes.map((code) => keyboard?.addKey(code)).filter((key): key is Input.Keyboard.Key => key !== undefined);

        this.keys = {
            up: keysFor('UP', 'W'),
            down: keysFor('DOWN', 'S'),
            left: keysFor('LEFT', 'A'),
            right: keysFor('RIGHT', 'D')
        };

        keyboard?.on('keydown', this.handleKey);
        this.input.on('pointerdown', this.handlePointerDown);
        this.input.on('pointermove', this.handlePointerMove);
        this.input.on('pointerup', this.handlePointerUp);
        this.input.on('pointerupoutside', this.handlePointerUp);
        this.events.once('shutdown', () => {
            keyboard?.off('keydown', this.handleKey);
            this.input.off('pointerdown', this.handlePointerDown);
            this.input.off('pointermove', this.handlePointerMove);
            this.input.off('pointerup', this.handlePointerUp);
            this.input.off('pointerupoutside', this.handlePointerUp);
            for (const key of Object.values(this.keys).flat()) {
                keyboard?.removeKey(key);
            }
        });
    }

    private readonly handleKey = (event: KeyboardEvent): void => {
        if (!event.repeat && QUIT_KEYS.includes(event.code)) {
            this.quit();
        }
    };

    // Only the first finger trims, so a palm resting on the screen does not cut a second line.
    private readonly handlePointerDown = (pointer: Input.Pointer, tappedObjects: GameObjects.GameObject[]): void => {
        if (this.ended || tappedObjects.length > 0 || this.activePointer !== null) {
            return;
        }

        this.activePointer = pointer.id;
        this.lastPoint = { x: pointer.x, y: pointer.y };
        this.keyboardPoint = null;
        this.cut(this.lastPoint, this.lastPoint);
    };

    private readonly handlePointerMove = (pointer: Input.Pointer): void => {
        if (this.ended || pointer.id !== this.activePointer || !this.lastPoint) {
            return;
        }

        const point = { x: pointer.x, y: pointer.y };
        this.cut(this.lastPoint, point);
        this.lastPoint = point;
    };

    private readonly handlePointerUp = (pointer: Input.Pointer): void => {
        if (pointer.id === this.activePointer) {
            this.activePointer = null;
            this.lastPoint = null;
        }
    };

    // The keyboard clippers start at the top of the G and stay on screen.
    private moveKeyboardClippers(frameMs: number): void {
        const dx = Number(this.held('right')) - Number(this.held('left'));
        const dy = Number(this.held('down')) - Number(this.held('up'));

        if (dx === 0 && dy === 0) {
            return;
        }

        const from = this.keyboardPoint ?? { ...GUIDE_POINTS[0] };
        const step = (KEY_SPEED * frameMs) / 1000 / Math.hypot(dx, dy);
        const to = {
            x: Math.max(0, Math.min(GAME_WIDTH - 1, from.x + dx * step)),
            y: Math.max(0, Math.min(GAME_HEIGHT - 1, from.y + dy * step))
        };

        this.keyboardPoint = to;
        this.cut(from, to);
    }

    private held(direction: Direction): boolean {
        return this.keys[direction].some((key) => key.isDown);
    }

    private cut(from: Point, to: Point): void {
        const before = this.state.trimmed;
        this.state = traceStroke(this.state, from, to);
        this.clippers.setPosition(Math.round(to.x), Math.round(to.y)).setVisible(true);

        this.state.trimmed.forEach((trimmed, i) => {
            if (trimmed && !before[i]) {
                this.dropLeaf(GUIDE_POINTS[i]);
            }
        });
    }

    private quit(): void {
        if (!this.ended) {
            this.ended = true;
            this.finish({ sideGameId: 'hedgeTrim', passed: false, score: 0 });
        }
    }

    // Drawing

    private createHedgeCanvas(): void {
        if (this.textures.exists(HEDGE_TEXTURE)) {
            this.textures.remove(HEDGE_TEXTURE);
        }

        const canvas = this.textures.createCanvas(HEDGE_TEXTURE, GAME_WIDTH, GAME_HEIGHT);
        if (!canvas) {
            throw new Error('Could not make the hedge canvas.');
        }

        this.canvas = canvas;
        this.pixels = canvas.context.createImageData(GAME_WIDTH, GAME_HEIGHT);
        this.add.image(0, 0, HEDGE_TEXTURE).setOrigin(0).setDepth(DEPTH.hedge);
    }

    private render(): void {
        const state = this.state;

        if (state.trimmedCount !== this.paintedCount) {
            this.paintedCount = state.trimmedCount;
            paintHedge(this.pixels.data, state.trimmed);
            this.canvas.context.putImageData(this.pixels, 0, 0);
            this.canvas.refresh();
        }

        const timeLeft = timeLeftMs(state);
        this.timeBar.setFraction(timeLeft / HEDGE_TRIM.timeLimitMs);
        this.timeBar.setColor(timeLeft < LOW_TIME_MS ? 'red' : 'teal');

        const aimShare = aim(state);
        this.neatText.setText(`NEAT ${percent(neatness(state))}`);
        this.aimText.setText(`AIM  ${aimShare === null ? '--' : percent(aimShare)}`);
        this.setTip(this.tipFor(state));
    }

    private tipFor(state: HedgeTrimState): string {
        const aimShare = aim(state);

        if (state.status === 'ready') {
            return 'TRACE THE LETTERS!';
        }
        if (timeLeftMs(state) < LOW_TIME_MS) {
            return 'HURRY!';
        }
        if (aimShare !== null && aimShare < 0.6) {
            return 'STAY ON THE HEDGE!';
        }
        if (neatness(state) > 0.75) {
            return 'ALMOST NEAT!';
        }
        return 'KEEP CLIPPING!';
    }

    // A clipped leaf flies off to one side and falls.
    private dropLeaf(point: Point): void {
        if (this.leaves >= MAX_LEAVES) {
            return;
        }

        const side = Math.random() < 0.5 ? -1 : 1;
        const color: ColorName = Math.random() < 0.5 ? 'leafLight' : 'leaf';
        const leaf = this.add.rectangle(Math.round(point.x), Math.round(point.y), 2, 1, colorNumber(color)).setOrigin(0).setDepth(DEPTH.leaves);

        this.leaves++;
        this.tweens.add({
            targets: leaf,
            x: leaf.x + side * (6 + Math.random() * 10),
            y: leaf.y + 10 + Math.random() * 8,
            alpha: 0,
            duration: 500 + Math.random() * 300,
            ease: 'Quad.easeIn',
            onComplete: () => {
                leaf.destroy();
                this.leaves--;
            }
        });
    }

    private addTitlePanel(): void {
        const panel = new Panel(this, TITLE.x, TITLE.y, TITLE.width, TITLE.height, { shadow: true }).setDepth(DEPTH.hud);
        const title = addPixelText(this, TITLE.x + 7, TITLE.y + 6, 'TRIM THE GB', 'ink').setDepth(DEPTH.hud);
        const label = addPixelText(this, TITLE.x + 7, TITLE.y + 17, 'TIME', 'ink').setDepth(DEPTH.hud);
        this.timeBar = new ProgressBar(this, TITLE.x + 43, TITLE.y + 17, 52, 7, 'teal').setDepth(DEPTH.hud);
        this.hud.push(panel, title, label, ...this.timeBar.gameObjects());
    }

    private addStatsPanel(): void {
        const panel = new Panel(this, STATS.x, STATS.y, STATS.width, STATS.height, { shadow: true }).setDepth(DEPTH.hud);
        this.neatText = addPixelText(this, STATS.x + 7, STATS.y + 6, '', 'ink').setDepth(DEPTH.hud);
        this.aimText = addPixelText(this, STATS.x + 7, STATS.y + 17, '', 'ink').setDepth(DEPTH.hud);
        this.hud.push(panel, this.neatText, this.aimText);
    }

    // The tip sits on the lawn, so it has a 1px ink shadow to stay readable.
    private addTip(): void {
        this.tipTexts = [
            addPixelText(this, TIP.x + 1, TIP.y + 1, '', 'ink').setDepth(DEPTH.hud),
            addPixelText(this, TIP.x, TIP.y, '', 'whiteCream').setDepth(DEPTH.hud)
        ];
        this.hud.push(...this.tipTexts);
    }

    private setTip(text: string): void {
        for (const tip of this.tipTexts) {
            if (tip.text !== text) {
                tip.setText(text);
            }
        }
    }

    // Ending

    // The HUD steps aside for a results card above the hedge, so the finished GB stays in view.
    private end(): void {
        this.ended = true;
        this.clippers.setVisible(false);

        const state = this.state;
        const passed = state.status === 'won';
        const score = scoreFor(state);
        const best = currentSave(this).sideBests.hedgeTrim ?? 0;
        const seconds = Math.ceil(state.elapsedMs / 1000);
        const lines: [string, ColorName][] = [
            [passed ? 'NEAT AS A PIN!' : "TIME'S UP!", passed ? 'teal' : 'brick'],
            [`TIME ${seconds}S  AIM ${percent(aim(state) ?? 0)}`, 'ink'],
            [score > best ? `SCORE ${score} BEST!` : `SCORE ${score}`, 'ink']
        ];

        for (const part of this.hud) {
            part.setVisible(false);
        }
        this.showResults(lines);
        this.time.delayedCall(END_DELAY_MS, () => this.finish({ sideGameId: 'hedgeTrim', passed, score }));
    }

    private showResults(lines: [string, ColorName][]): void {
        const width = Math.max(...lines.map(([text]) => pixelTextWidth(text))) + 16;
        const centerX = GAME_WIDTH / 2;

        new Panel(this, Math.round(centerX - width / 2), 4, width, 40, { shadow: true }).setDepth(DEPTH.results);
        lines.forEach(([text, color], i) => {
            addPixelText(this, centeredX(text, centerX), 10 + i * 10, text, color).setDepth(DEPTH.results);
        });
    }

    private finish(sideGameResult: SideGameResult): void {
        this.scene.start('Overworld', { sideGameResult });
    }
}

function percent(share: number): string {
    return `${Math.round(share * 100)}%`;
}
