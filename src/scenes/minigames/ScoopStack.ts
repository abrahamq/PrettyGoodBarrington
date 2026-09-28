// Scoop Stack, the SoCo Creamery minigame (docs/mocks/SoCo.dc.html). The rules live in src/logic/scoopStack.ts;
// this scene draws the current state every frame and passes on input.
// Drop: tap anywhere, tap [A] DROP, or press Space, Enter, Z, or A.
// Quit: tap [B] QUIT, or press Escape, Backspace, X, or B. Quitting earns no stamp.
import { Scene, type GameObjects, type Input } from 'phaser';
import { FLAVOR_SWATCHES } from '../../art/scoopShop.ts';
import { SCOOP_ICON_TEXTURES, SCOOP_TEXTURES, TEXTURES } from '../../art/textures.ts';
import type { StopId } from '../../data/stops.ts';
import {
    SCOOP_STACK, currentFlavor, dropScoop, landingY, newScoopStack, scoopOffsets, scoreFor, timeLeftMs,
    updateScoopStack, wobbleFraction, wobbleLevel, type Flavor, type LossReason, type ScoopStackState, type WobbleLevel
} from '../../logic/scoopStack.ts';
import { colorNumber } from '../../palette.ts';
import type { MinigameResult } from '../../state/progress.ts';
import { Button } from '../../ui/Button.ts';
import { Panel } from '../../ui/Panel.ts';
import { ProgressBar } from '../../ui/ProgressBar.ts';
import { addPixelText, centeredX } from '../../ui/text.ts';

interface ScoopStackData {
    stopId?: StopId;
}

const CONE_X = 120;
const CONE_LEFT = CONE_X - 8;
// A scoop's sprite starts 9px above its bottom edge; its drips hang 2px lower, over the scoop below.
const SCOOP_RISE = 9;
const MAX_FRAME_MS = 100;
const END_DELAY_MS = 1800;
const LOW_TIME_MS = 5000;
const SPILL_FLOOR_Y = 104;
const DROP_KEYS = ['Space', 'Enter', 'NumpadEnter', 'KeyZ', 'KeyA'];
const QUIT_KEYS = ['Escape', 'Backspace', 'KeyX', 'KeyB'];

const DEPTH = { cone: 1, stack: 2, hud: 10, moving: 20, banner: 30 };

const TITLE = { x: 4, y: 4, width: 102, height: 31 };
const STACK = { x: 4, y: 38, width: 102, height: 54 };
const METER = { x: 11, y: 80, width: 88, height: 6 };
const TIP = { x: 4, y: 124, width: 150, height: 32 };

const FLAVOR_NAMES: Record<Flavor, string> = {
    vanilla: 'VANILLA',
    darkChoc: 'DARK CHOC',
    strawberry: 'STRAWBERRY',
    mintChip: 'MINT CHIP'
};
const TIPS: Record<WobbleLevel | 'first', string> = {
    first: 'DROP ON THE CONE',
    safe: 'NICE AND STEADY',
    warn: 'WAIT FOR THE SWAY',
    danger: 'TOO WOBBLY! WAIT'
};
const ENDINGS: Record<'won' | LossReason, string> = {
    won: 'STACKED!',
    spill: 'SPLAT!',
    topple: 'IT TOPPLED!',
    time: "TIME'S UP!"
};

export class ScoopStack extends Scene {
    private state!: ScoopStackState;
    private stopId: StopId = 'soco';
    private ended = false;
    private stackSprites: GameObjects.Image[] = [];
    private sliding!: GameObjects.Image;
    private falling!: GameObjects.Image;
    private flavorArrow!: GameObjects.Image;
    private timeBar!: ProgressBar;
    private countText!: GameObjects.Text;
    private icons: GameObjects.Image[] = [];
    private marker!: GameObjects.Rectangle;
    private nextText!: GameObjects.Text;
    private tipText!: GameObjects.Text;

    constructor() {
        super('ScoopStack');
    }

    create(data: ScoopStackData): void {
        this.stopId = data?.stopId ?? 'soco';
        this.state = newScoopStack();
        this.ended = false;
        this.stackSprites = [];
        this.icons = [];

        this.add.image(0, 0, TEXTURES.socoBackground).setOrigin(0);
        addPixelText(this, centeredX('FLAVORS', 188), 17, 'FLAVORS', 'gold');
        this.flavorArrow = this.add.image(149, 0, TEXTURES.cursor).setOrigin(0);
        this.add.image(CONE_LEFT, SCOOP_STACK.coneTopY, TEXTURES.cone).setOrigin(0).setDepth(DEPTH.cone);

        this.falling = this.add.image(0, 0, SCOOP_TEXTURES.vanilla).setOrigin(0).setDepth(DEPTH.moving).setVisible(false);
        this.sliding = this.add.image(0, 0, SCOOP_TEXTURES.vanilla).setOrigin(0).setDepth(DEPTH.moving);

        this.addTitlePanel();
        this.addStackPanel();
        this.addTipPanel();
        new Button(this, 160, 122, 76, 14, '[B] QUIT', 'secondary', () => this.quit());
        new Button(this, 160, 139, 76, 17, '[A] DROP', 'primary', () => this.drop());

        this.input.keyboard?.on('keydown', this.handleKey);
        this.input.on('pointerdown', this.handleTap);
        this.events.once('shutdown', () => {
            this.input.keyboard?.off('keydown', this.handleKey);
            this.input.off('pointerdown', this.handleTap);
        });

        this.render();
    }

    update(_time: number, deltaMs: number): void {
        if (this.ended) {
            return;
        }

        this.state = updateScoopStack(this.state, Math.min(deltaMs, MAX_FRAME_MS));
        this.render();

        if (this.state.status !== 'playing') {
            this.end();
        }
    }

    // Input

    private readonly handleKey = (event: KeyboardEvent): void => {
        if (event.repeat) {
            return;
        }
        if (DROP_KEYS.includes(event.code)) {
            this.drop();
        } else if (QUIT_KEYS.includes(event.code)) {
            this.quit();
        }
    };

    // A tap anywhere drops the scoop, except on a button (buttons handle their own taps).
    private readonly handleTap = (_pointer: Input.Pointer, tappedObjects: GameObjects.GameObject[]): void => {
        if (tappedObjects.length === 0) {
            this.drop();
        }
    };

    private drop(): void {
        if (!this.ended) {
            this.state = dropScoop(this.state);
        }
    }

    private quit(): void {
        if (!this.ended) {
            this.ended = true;
            this.finish({ stopId: this.stopId, passed: false, score: 0 });
        }
    }

    // Drawing

    private render(): void {
        const state = this.state;
        const flavor = currentFlavor(state);
        const offsets = scoopOffsets(state);

        while (this.stackSprites.length < state.stack.length) {
            const scoop = state.stack[this.stackSprites.length];
            this.stackSprites.push(this.add.image(0, 0, SCOOP_TEXTURES[scoop.flavor]).setOrigin(0).setDepth(DEPTH.stack));
        }
        this.stackSprites.forEach((sprite, i) => {
            sprite.setPosition(CONE_LEFT + offsets[i], SCOOP_STACK.coneTopY - i * SCOOP_STACK.scoopStep - SCOOP_RISE);
        });

        this.sliding.setTexture(SCOOP_TEXTURES[flavor]);
        this.sliding.setPosition(CONE_LEFT + state.slideX, SCOOP_STACK.slideY - SCOOP_RISE);
        this.sliding.setVisible(state.status === 'playing' && !state.falling);

        this.falling.setVisible(state.falling !== null);
        if (state.falling) {
            this.falling.setTexture(SCOOP_TEXTURES[flavor]);
            this.falling.setPosition(CONE_LEFT + state.falling.x, state.falling.y - SCOOP_RISE);
        }

        const timeLeft = timeLeftMs(state);
        this.timeBar.setFraction(timeLeft / SCOOP_STACK.timeLimitMs);
        this.timeBar.setColor(timeLeft < LOW_TIME_MS ? 'red' : 'teal');

        this.countText.setText(`${state.stack.length}/${SCOOP_STACK.goal}`);
        this.icons.forEach((icon, i) => {
            const scoop = state.stack[i];
            icon.setTexture(scoop ? SCOOP_ICON_TEXTURES[scoop.flavor] : TEXTURES.emptyScoopIcon);
        });
        this.marker.x = METER.x + 1 + Math.round(wobbleFraction(state) * (METER.width - 2)) - 1;

        // Once the round is over, keep the last "next" and tip instead of naming a scoop that will never come.
        if (state.status === 'playing') {
            this.nextText.setText(`NEXT: ${FLAVOR_NAMES[flavor]}`);
            this.tipText.setText(state.stack.length === 0 ? TIPS.first : TIPS[wobbleLevel(state)]);
            this.flavorArrow.y = FLAVOR_SWATCHES[flavor][1] - 1;
        }
    }

    private addTitlePanel(): void {
        new Panel(this, TITLE.x, TITLE.y, TITLE.width, TITLE.height, { shadow: true }).setDepth(DEPTH.hud);
        addPixelText(this, TITLE.x + 7, TITLE.y + 6, 'SCOOP STACK', 'ink').setDepth(DEPTH.hud);
        addPixelText(this, TITLE.x + 7, TITLE.y + 17, 'TIME', 'ink').setDepth(DEPTH.hud);
        this.timeBar = new ProgressBar(this, TITLE.x + 43, TITLE.y + 17, 52, 7, 'teal').setDepth(DEPTH.hud);
    }

    private addStackPanel(): void {
        new Panel(this, STACK.x, STACK.y, STACK.width, STACK.height, { shadow: true }).setDepth(DEPTH.hud);
        addPixelText(this, STACK.x + 7, STACK.y + 6, 'STACK', 'ink').setDepth(DEPTH.hud);
        this.countText = addPixelText(this, STACK.x + STACK.width - 7 - 24, STACK.y + 6, '', 'ink').setDepth(DEPTH.hud);

        for (let i = 0; i < SCOOP_STACK.goal; i++) {
            this.icons.push(this.add.image(STACK.x + 7 + i * 18, STACK.y + 17, TEXTURES.emptyScoopIcon).setOrigin(0).setDepth(DEPTH.hud));
        }

        addPixelText(this, STACK.x + 7, STACK.y + 32, 'WOBBLE', 'ink').setDepth(DEPTH.hud);
        this.addWobbleMeter();
    }

    // Safe (mint) for the first half, warn (amber) for the next 30%, danger (red) for the last 20%.
    private addWobbleMeter(): void {
        const inner = METER.width - 2;
        const safe = Math.round(inner * 0.5);
        const warn = Math.round(inner * 0.3);
        const zones: [number, number, 'mint' | 'amber' | 'red'][] = [
            [0, safe, 'mint'],
            [safe, warn, 'amber'],
            [safe + warn, inner - safe - warn, 'red']
        ];

        this.add.rectangle(METER.x, METER.y, METER.width, METER.height, colorNumber('ink')).setOrigin(0).setDepth(DEPTH.hud);
        for (const [start, width, color] of zones) {
            this.add.rectangle(METER.x + 1 + start, METER.y + 1, width, METER.height - 2, colorNumber(color))
                .setOrigin(0)
                .setDepth(DEPTH.hud);
        }
        this.marker = this.add.rectangle(METER.x, METER.y - 2, 2, METER.height + 4, colorNumber('ink')).setOrigin(0).setDepth(DEPTH.hud);
    }

    private addTipPanel(): void {
        new Panel(this, TIP.x, TIP.y, TIP.width, TIP.height, { shadow: true }).setDepth(DEPTH.hud);
        this.nextText = addPixelText(this, TIP.x + 7, TIP.y + 7, '', 'ink').setDepth(DEPTH.hud);
        this.tipText = addPixelText(this, TIP.x + 7, TIP.y + 17, '', 'wood').setDepth(DEPTH.hud);
    }

    // Ending

    private end(): void {
        this.ended = true;
        const state = this.state;
        const passed = state.status === 'won';

        if (state.lossReason === 'spill') {
            this.showSpill();
        } else if (state.lossReason === 'topple') {
            this.showTopple();
        }

        this.showBanner(ENDINGS[state.lossReason ?? 'won'], `SCORE ${scoreFor(state)}`);
        this.time.delayedCall(END_DELAY_MS, () => this.finish({ stopId: this.stopId, passed, score: scoreFor(state) }));
    }

    // The missed scoop keeps falling past the stack and lands on the checkered floor.
    private showSpill(): void {
        const x = this.state.spilledX ?? 0;

        this.falling.setVisible(true);
        this.falling.setTexture(SCOOP_TEXTURES[currentFlavor(this.state)]);
        this.falling.setPosition(CONE_LEFT + x, landingY(this.state) - SCOOP_RISE);
        this.tweens.add({ targets: this.falling, x: this.falling.x + Math.sign(x || 1) * 12, y: SPILL_FLOOR_Y, duration: 450 });
    }

    // The stack tips over toward the side it was leaning, higher scoops flying farther.
    private showTopple(): void {
        const offsets = scoopOffsets(this.state);
        const direction = Math.sign(offsets[offsets.length - 1] || 1);

        this.stackSprites.forEach((sprite, i) => {
            this.tweens.add({
                targets: sprite,
                x: sprite.x + direction * (16 + i * 10),
                y: sprite.y + 12 + i * 6,
                angle: direction * (25 + i * 15),
                duration: 600
            });
        });
    }

    // Sits above the tallest possible stack, so the finished cone stays in view.
    private showBanner(title: string, subtitle: string): void {
        const width = 120;
        const top = 12;

        new Panel(this, CONE_X - width / 2, top, width, 32, { shadow: true }).setDepth(DEPTH.banner);
        addPixelText(this, centeredX(title, CONE_X), top + 7, title, 'brick').setDepth(DEPTH.banner);
        addPixelText(this, centeredX(subtitle, CONE_X), top + 17, subtitle, 'ink').setDepth(DEPTH.banner);
    }

    private finish(result: MinigameResult): void {
        this.scene.start('Overworld', { result });
    }
}
