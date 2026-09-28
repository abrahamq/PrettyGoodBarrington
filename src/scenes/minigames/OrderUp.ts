// Order Up!, the GB Eats minigame (docs/mocks/GBEats.dc.html). The rules live in src/logic/orderUp.ts;
// this scene draws the grill, the order tickets, and the HUD, and passes on taps and keys.
// Touch: tap a grill spot to add, flip, serve, or toss the patty there.
// Keyboard: Left and Right pick a spot (or press 1-4), Space, Enter, Z, or A acts on it. Escape, Backspace,
// X, or B quits (no stamp, no tips).
import { Scene, type GameObjects, type Types } from 'phaser';
import { PATTY_TEXTURES, TEXTURES } from '../../art/textures.ts';
import type { StopId } from '../../data/stops.ts';
import {
    ORDER_UP, donenessOf, formatDollars, needsFlip, newOrderUp, roundLeftMs, slotAction, tapSlot, updateOrderUp,
    type Doneness, type OrderDoneness, type OrderEvent, type OrderUpState, type SlotAction, type Ticket
} from '../../logic/orderUp.ts';
import { colorNumber, type ColorName } from '../../palette.ts';
import type { MinigameResult } from '../../state/progress.ts';
import { showBanner } from '../../ui/Banner.ts';
import { Button } from '../../ui/Button.ts';
import { Panel } from '../../ui/Panel.ts';
import { floatText } from '../../ui/Popup.ts';
import { ProgressBar } from '../../ui/ProgressBar.ts';
import { addPixelText, centeredX } from '../../ui/text.ts';

interface OrderUpData {
    stopId?: StopId;
}

const MAX_FRAME_MS = 100;
const END_DELAY_MS = 2000;
const BURGER_SHOW_MS = 900;
const GRILL = { x: 20, y: 64, width: 142, height: 56, pattyY: 86 };
const PLATE = { x: 188, y: 84, centerX: 198 };
const TITLE = { x: 4, y: 4, width: 86, height: 38 };
const TIP = { x: 4, y: 124, width: 150, height: 32 };
const TICKET = { x: 94, y: 9, width: 46, height: 40, gap: 2, drop: [0, 2, 1] };
const ACT_KEYS = ['Space', 'Enter', 'NumpadEnter', 'KeyZ', 'KeyA'];
const QUIT_KEYS = ['Escape', 'Backspace', 'KeyX', 'KeyB'];
const DEPTH = { patty: 1, overlay: 2, hud: 10 };

// A burnt patty is labeled with what to do; "BURNT" would also be too wide for its grill spot.
const PATTY_LABELS: Record<Doneness, string> = { raw: 'RAW', rare: 'RARE', medium: 'MED', well: 'WELL', burnt: 'TOSS' };
const ORDER_WORDS: Record<OrderDoneness, string> = { rare: 'RARE', medium: 'MEDIUM', well: 'WELL' };
const TICKET_WORDS: Record<OrderDoneness, string> = { rare: 'RARE', medium: 'MED', well: 'WELL' };
const SWATCHES: Record<OrderDoneness, ColorName> = { rare: 'pattyRare', medium: 'wood', well: 'bark' };
const ACTION_WORDS: Record<SlotAction, string> = { add: 'ADD', flip: 'FLIP', serve: 'SERVE', toss: 'TOSS', wait: 'WAIT' };

// Grill spots are the 4 equal columns of the cooking surface.
const SPOTS = [0, 1, 2, 3].map((i) => {
    const left = GRILL.x + Math.round((i * GRILL.width) / ORDER_UP.slots);
    const right = GRILL.x + Math.round(((i + 1) * GRILL.width) / ORDER_UP.slots);
    return { left, width: right - left, centerX: Math.round((left + right) / 2) };
});

interface SpotView {
    patty: GameObjects.Image;
    smoke: GameObjects.Image;
    label: GameObjects.Text;
    flipWarning: GameObjects.Text[];
}

type Showable = GameObjects.Rectangle | GameObjects.Text | GameObjects.Image;

interface TicketView {
    parts: Showable[];
    strip: GameObjects.Rectangle;
    number: GameObjects.Text;
    word: GameObjects.Text;
    swatch: GameObjects.Rectangle;
    cheese: GameObjects.Image;
    fries: GameObjects.Image;
    patience: ProgressBar;
    shownId: number | null;
}

export class OrderUp extends Scene {
    private state!: OrderUpState;
    private stopId: StopId = 'gbeats';
    private ended = false;
    private selected = 0;
    private spots: SpotView[] = [];
    private tickets: TicketView[] = [];
    private frame: GameObjects.Rectangle[] = [];
    private burger!: GameObjects.Image;
    private tipsText!: GameObjects.Text;
    private timeBar!: ProgressBar;
    private hintText!: GameObjects.Text;
    private nextText!: GameObjects.Text;
    private actionButton!: Button;

    constructor() {
        super('OrderUp');
    }

    create(data: OrderUpData): void {
        this.stopId = data?.stopId ?? 'gbeats';
        this.state = newOrderUp(Date.now() >>> 0);
        this.ended = false;
        this.selected = 0;
        this.spots = [];
        this.tickets = [];

        this.add.image(0, 0, TEXTURES.gbeatsBackground).setOrigin(0);
        this.burger = this.add.image(PLATE.x, PLATE.y, TEXTURES.burger).setOrigin(0).setVisible(false);

        SPOTS.forEach((spot, i) => this.addSpot(spot, i));
        this.frame = this.addSelectionFrame();
        for (let i = 0; i < ORDER_UP.maxTickets; i++) {
            this.tickets.push(this.addTicket(i));
        }

        this.addTitlePanel();
        this.addTipPanel();
        new Button(this, 160, 122, 76, 14, '[B] QUIT', 'secondary', () => this.quit());
        this.actionButton = new Button(this, 160, 139, 76, 17, '[A] ADD', 'primary', () => this.act(this.selected));

        this.input.keyboard?.on('keydown', this.handleKey);
        this.events.once('shutdown', () => this.input.keyboard?.off('keydown', this.handleKey));

        this.render();
    }

    update(_time: number, deltaMs: number): void {
        if (this.ended) {
            return;
        }

        this.state = updateOrderUp(this.state, Math.min(deltaMs, MAX_FRAME_MS));
        this.showEvents(this.state.events);
        this.render();

        if (this.state.status !== 'playing') {
            this.end();
        }
    }

    // Input

    private readonly handleKey = (event: KeyboardEvent): void => {
        if (event.repeat || this.ended) {
            return;
        }

        const digit = ['Digit1', 'Digit2', 'Digit3', 'Digit4'].indexOf(event.code);
        if (digit !== -1) {
            this.act(digit);
        } else if (event.code === 'ArrowLeft') {
            this.select((this.selected + ORDER_UP.slots - 1) % ORDER_UP.slots);
        } else if (event.code === 'ArrowRight') {
            this.select((this.selected + 1) % ORDER_UP.slots);
        } else if (ACT_KEYS.includes(event.code)) {
            this.act(this.selected);
        } else if (QUIT_KEYS.includes(event.code)) {
            this.quit();
        }
    };

    private select(slot: number): void {
        this.selected = slot;
        this.render();
    }

    private act(slot: number): void {
        if (this.ended) {
            return;
        }

        this.selected = slot;
        this.state = tapSlot(this.state, slot);
        this.showEvents(this.state.events);
        this.render();
    }

    private quit(): void {
        if (!this.ended) {
            this.ended = true;
            this.finish({ stopId: this.stopId, passed: false, score: 0, tips: 0 });
        }
    }

    // Drawing

    private render(): void {
        const state = this.state;

        state.grill.forEach((patty, i) => {
            const view = this.spots[i];
            const doneness = patty ? donenessOf(patty) : null;
            const warn = patty !== null && needsFlip(patty);

            view.patty.setVisible(doneness !== null);
            view.smoke.setVisible(doneness === 'burnt');
            view.label.setText(doneness ? PATTY_LABELS[doneness] : '');
            view.label.x = centeredX(view.label.text, SPOTS[i].centerX);
            view.flipWarning.forEach((text) => text.setVisible(warn && Math.floor(this.time.now / 250) % 2 === 0));
            if (doneness) {
                view.patty.setTexture(PATTY_TEXTURES[doneness]);
            }
        });

        const spot = SPOTS[this.selected];
        const [top, bottom, left, right] = this.frame;
        top.setPosition(spot.left, GRILL.y + 5).setSize(spot.width, 1);
        bottom.setPosition(spot.left, GRILL.y + GRILL.height - 7).setSize(spot.width, 1);
        left.setPosition(spot.left, GRILL.y + 5);
        right.setPosition(spot.left + spot.width - 1, GRILL.y + 5);

        this.tickets.forEach((view, i) => this.renderTicket(view, state.tickets[i], i === 0));

        this.tipsText.setText(formatDollars(state.tipsCents));
        this.timeBar.setFraction(roundLeftMs(state) / ORDER_UP.roundMs);
        this.actionButton.setLabel(`[A] ${ACTION_WORDS[slotAction(state, this.selected)]}`);
        this.hintText.setText(hintFor(state));
        this.nextText.setText(state.tickets[0] ? `NEXT: #${state.tickets[0].id} ${ORDER_WORDS[state.tickets[0].doneness]}` : 'WAITING FOR ORDER');
    }

    private renderTicket(view: TicketView, ticket: Ticket | undefined, oldest: boolean): void {
        view.parts.forEach((part) => part.setVisible(ticket !== undefined));
        if (!ticket) {
            view.shownId = null;
            return;
        }

        if (view.shownId !== ticket.id) {
            view.shownId = ticket.id;
            view.number.setText(`#${ticket.id}`);
            view.word.setText(TICKET_WORDS[ticket.doneness]);
            view.swatch.setFillStyle(colorNumber(SWATCHES[ticket.doneness]));
        }

        const hasCheese = ticket.extras.includes('cheese');
        const hasFries = ticket.extras.includes('fries');
        view.cheese.setVisible(hasCheese);
        view.fries.setVisible(hasFries).setX(view.cheese.x + (hasCheese ? 9 : 0));
        view.strip.setVisible(oldest);

        const patience = ticket.patienceMs / ORDER_UP.patienceMs;
        view.patience.setFraction(patience);
        view.patience.setColor(patience > 0.6 ? 'teal' : patience > 0.3 ? 'amber' : 'red');
    }

    private showEvents(events: OrderEvent[]): void {
        for (const event of events) {
            switch (event.kind) {
                case 'tip':
                    floatText(this, PLATE.centerX, PLATE.y - 12, `+${formatDollars(event.cents)}`, 'mint');
                    this.showBurger();
                    break;
                case 'wrong':
                    floatText(this, PLATE.centerX, PLATE.y - 12, 'WRONG!', 'pink');
                    break;
                case 'expired':
                    floatText(this, 165, 52, 'TOO SLOW!', 'pink');
                    break;
                case 'toss':
                    floatText(this, SPOTS[event.slot].centerX, 78, 'TOSSED', 'cream');
                    break;
                case 'noTicket':
                    floatText(this, SPOTS[event.slot].centerX, 78, 'NO ORDER', 'cream');
                    break;
            }
        }
    }

    private showBurger(): void {
        this.burger.setVisible(true);
        this.time.delayedCall(BURGER_SHOW_MS, () => this.burger.setVisible(false));
    }

    // Setup

    private addSpot(spot: (typeof SPOTS)[number], index: number): void {
        const patty = this.add.image(spot.centerX - 8, GRILL.pattyY, PATTY_TEXTURES.raw).setOrigin(0).setDepth(DEPTH.patty);
        const smoke = this.add.image(spot.centerX - 3, GRILL.pattyY - 12, TEXTURES.smoke).setOrigin(0).setDepth(DEPTH.overlay);
        const label = addPixelText(this, spot.centerX, GRILL.pattyY + 14, '', 'cream').setDepth(DEPTH.overlay);
        const flipX = centeredX('FLIP!', spot.centerX);
        const flipWarning = [
            addPixelText(this, flipX + 2, GRILL.pattyY - 12, 'FLIP!', 'ink').setDepth(DEPTH.overlay),
            addPixelText(this, flipX + 1, GRILL.pattyY - 13, 'FLIP!', 'brick').setDepth(DEPTH.overlay),
            addPixelText(this, flipX, GRILL.pattyY - 14, 'FLIP!', 'gold').setDepth(DEPTH.overlay)
        ];

        // The whole column of the grill is the tap target for this spot.
        this.add.zone(spot.left, GRILL.y, spot.width, GRILL.height).setOrigin(0).setInteractive({ useHandCursor: true })
            .on('pointerdown', (_pointer: unknown, _x: number, _y: number, event: Types.Input.EventData) => {
                event.stopPropagation();
                this.act(index);
            });

        this.spots.push({ patty, smoke, label, flipWarning });
    }

    private addSelectionFrame(): GameObjects.Rectangle[] {
        const height = GRILL.height - 11;
        const gold = colorNumber('gold');

        return [
            this.add.rectangle(0, 0, 1, 1, gold),
            this.add.rectangle(0, 0, 1, 1, gold),
            this.add.rectangle(0, 0, 1, height, gold),
            this.add.rectangle(0, 0, 1, height, gold)
        ].map((edge) => edge.setOrigin(0).setDepth(DEPTH.overlay));
    }

    private addTicket(index: number): TicketView {
        const x = TICKET.x + index * (TICKET.width + TICKET.gap);
        const y = TICKET.y + TICKET.drop[index];
        const shadow = this.add.rectangle(x + 2, y + 2, TICKET.width, TICKET.height, colorNumber('ink'), 0.3).setOrigin(0);
        const border = this.add.rectangle(x, y, TICKET.width, TICKET.height, colorNumber('ink')).setOrigin(0);
        const paper = this.add.rectangle(x + 1, y + 1, TICKET.width - 2, TICKET.height - 2, colorNumber('whiteCream')).setOrigin(0);
        // Gold strip on the oldest ticket: the next patty served goes to it.
        const strip = this.add.rectangle(x + 1, y + 1, TICKET.width - 2, 2, colorNumber('gold')).setOrigin(0);
        const number = addPixelText(this, x + 4, y + 5, '', 'ink');
        const word = addPixelText(this, x + 4, y + 15, '', 'ink');
        const swatch = this.add.rectangle(x + TICKET.width - 9, y + 16, 5, 5, colorNumber('wood')).setOrigin(0);
        const cheese = this.add.image(x + 4, y + 26, TEXTURES.cheeseIcon).setOrigin(0);
        const fries = this.add.image(x + 4, y + 26, TEXTURES.friesIcon).setOrigin(0);
        const patience = new ProgressBar(this, x + 4, y + TICKET.height - 7, TICKET.width - 8, 4, 'teal');

        return {
            parts: [shadow, border, paper, strip, number, word, swatch, cheese, fries, ...patience.gameObjects()],
            strip, number, word, swatch, cheese, fries, patience, shownId: null
        };
    }

    private addTitlePanel(): void {
        new Panel(this, TITLE.x, TITLE.y, TITLE.width, TITLE.height, { shadow: true }).setDepth(DEPTH.hud);
        addPixelText(this, TITLE.x + 7, TITLE.y + 6, 'ORDER UP!', 'ink').setDepth(DEPTH.hud);
        this.tipsText = addPixelText(this, TITLE.x + 7, TITLE.y + 16, '', 'teal').setDepth(DEPTH.hud);
        this.timeBar = new ProgressBar(this, TITLE.x + 7, TITLE.y + 27, TITLE.width - 14, 5, 'teal').setDepth(DEPTH.hud);
    }

    private addTipPanel(): void {
        new Panel(this, TIP.x, TIP.y, TIP.width, TIP.height, { shadow: true }).setDepth(DEPTH.hud);
        this.hintText = addPixelText(this, TIP.x + 7, TIP.y + 7, '', 'ink').setDepth(DEPTH.hud);
        this.nextText = addPixelText(this, TIP.x + 7, TIP.y + 17, '', 'wood').setDepth(DEPTH.hud);
    }

    // Ending

    private end(): void {
        this.ended = true;
        const passed = this.state.status === 'won';
        const tips = this.state.tipsCents;
        const subtitle = passed ? `TIPS ${formatDollars(tips)}` : `TIPS ${formatDollars(tips)} OF $10`;

        showBanner(this, 91, 66, passed ? 'GREAT SHIFT!' : 'SHIFT OVER', subtitle, passed ? 'teal' : 'brick');
        this.time.delayedCall(END_DELAY_MS, () => this.finish({ stopId: this.stopId, passed, score: tips, tips }));
    }

    private finish(result: MinigameResult): void {
        this.scene.start('Overworld', { result });
    }
}

// One short tip for the tip panel (at most 17 characters), picked from what is on the grill.
function hintFor(state: OrderUpState): string {
    const patties = state.grill.filter((patty) => patty !== null);

    if (patties.some(needsFlip)) {
        return 'FLIP IT NOW!';
    }
    if (patties.some((patty) => donenessOf(patty) === 'burnt')) {
        return 'TOSS BURNT ONES';
    }
    if (patties.length === 0) {
        return 'TAP GRILL: PATTY';
    }
    return patties.some((patty) => patty.flipped) ? 'SERVE WHEN READY' : 'FLIP EACH ONCE';
}
