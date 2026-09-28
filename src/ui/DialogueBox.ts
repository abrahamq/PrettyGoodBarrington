// The dialogue box at the bottom of the screen: a panel with the speaker's name on a tab, text that types
// itself out, and optional choices in a small menu above the box's right end.
// Tap, or press Space, Enter, or Z, to finish the page; do it again for the next page.
// After the last page the box closes, unless it has choices: then picking a choice closes it.
import type { GameObjects, Scene, Types } from 'phaser';
import { TEXTURES } from '../art/textures.ts';
import { GAME_HEIGHT, GAME_WIDTH } from '../layout.ts';
import { pageLength, pagesFor, revealLines, visibleCharacters } from '../logic/pages.ts';
import { colorNumber } from '../palette.ts';
import { Menu, menuSize } from './Menu.ts';
import { Panel } from './Panel.ts';
import { addPixelText, pixelTextWidth } from './text.ts';

export interface DialogueChoice {
    label: string;
    onSelect: () => void;
}

export interface DialogueRequest {
    speaker: string;
    paragraphs: string[];
    choices?: DialogueChoice[];
    onClose?: () => void;
}

const BOX = { x: 4, y: 116, width: 232, height: 40 };
const TEXT_INSET = 7;
const LINE_HEIGHT = 10;
const LINES_PER_PAGE = 3;
const CHARS_PER_LINE = Math.floor((BOX.width - TEXT_INSET * 2) / 8);
const TAB = { x: BOX.x + 6, y: BOX.y - 9, height: 12 };
const ACTION_KEYS = ['Space', 'Enter', 'NumpadEnter', 'KeyZ'];
const BLINK_MS = 400;

export class DialogueBox {
    private readonly scene: Scene;
    private readonly panel: Panel;
    private readonly tab: GameObjects.Rectangle;
    private readonly speaker: GameObjects.Text;
    private readonly lines: GameObjects.Text[] = [];
    private readonly more: GameObjects.Image;
    private readonly blocker: GameObjects.Zone;
    private request?: DialogueRequest;
    private pages: string[][] = [];
    private pageIndex = 0;
    private elapsedMs = 0;
    private openedAt = 0;
    private choiceMenu?: Menu;

    constructor(scene: Scene) {
        this.scene = scene;

        // Covers the whole screen while the box is open, so a tap anywhere advances the text
        // and never reaches the Overworld underneath.
        this.blocker = scene.add.zone(0, 0, GAME_WIDTH, GAME_HEIGHT).setOrigin(0).setInteractive();
        this.blocker.on('pointerdown', (pointer: { event: Event }, _x: number, _y: number, event: Types.Input.EventData) => {
            event.stopPropagation();
            this.advance(pointer.event.timeStamp);
        });

        this.panel = new Panel(scene, BOX.x, BOX.y, BOX.width, BOX.height, { shadow: true });
        this.tab = scene.add.rectangle(TAB.x, TAB.y, 0, TAB.height, colorNumber('ink')).setOrigin(0);
        this.speaker = addPixelText(scene, TAB.x + 3, TAB.y + 2, '', 'gold');
        for (let i = 0; i < LINES_PER_PAGE; i++) {
            this.lines.push(addPixelText(scene, BOX.x + TEXT_INSET, BOX.y + TEXT_INSET + i * LINE_HEIGHT, '', 'ink'));
        }
        this.more = scene.add.image(BOX.x + BOX.width - 11, BOX.y + BOX.height - 7, TEXTURES.more).setOrigin(0);

        scene.input.keyboard?.on('keydown', this.handleKey);
        this.hide();
    }

    get isOpen(): boolean {
        return this.request !== undefined;
    }

    open(request: DialogueRequest): void {
        this.request = request;
        this.pages = pagesFor(request.paragraphs, CHARS_PER_LINE, LINES_PER_PAGE);
        if (this.pages.length === 0) {
            this.pages = [['']];
        }
        this.pageIndex = 0;
        this.elapsedMs = 0;
        // The key press or tap that opened the box must not also advance it.
        this.openedAt = performance.now();

        this.tab.width = pixelTextWidth(request.speaker) + 6;
        this.speaker.setText(request.speaker);
        this.show();
        this.renderPage();
    }

    update(deltaMs: number): void {
        if (!this.isOpen) {
            return;
        }

        if (!this.pageComplete()) {
            this.elapsedMs += deltaMs;
            this.renderPage();
        } else if (this.onLastPage() && this.hasChoices() && !this.choiceMenu) {
            this.showChoices();
        }

        const waiting = this.pageComplete() && !(this.onLastPage() && this.hasChoices());
        this.more.setVisible(waiting && Math.floor(this.scene.time.now / BLINK_MS) % 2 === 0);
    }

    close(): void {
        this.request = undefined;
        this.choiceMenu?.destroy();
        this.choiceMenu = undefined;
        this.hide();
    }

    private readonly handleKey = (event: KeyboardEvent): void => {
        if (ACTION_KEYS.includes(event.code) && !event.repeat) {
            this.advance(event.timeStamp);
        }
    };

    private advance(eventTime: number): void {
        if (!this.request || eventTime <= this.openedAt || this.choiceMenu) {
            return;
        }

        if (!this.pageComplete()) {
            this.elapsedMs = Number.MAX_SAFE_INTEGER;
            this.renderPage();
            return;
        }

        if (!this.onLastPage()) {
            this.pageIndex += 1;
            this.elapsedMs = 0;
            this.renderPage();
            return;
        }

        if (!this.hasChoices()) {
            const onClose = this.request.onClose;
            this.close();
            onClose?.();
        }
    }

    private showChoices(): void {
        const choices = this.request?.choices ?? [];
        const size = menuSize(choices.map((choice) => choice.label));
        const right = BOX.x + BOX.width;

        this.choiceMenu = new Menu(
            this.scene,
            right - size.width / 2,
            BOX.y - 4 - size.height,
            choices.map((choice) => ({ label: choice.label, onSelect: () => this.choose(choice) })),
            { onCancel: () => this.choose(choices[choices.length - 1]) }
        );
    }

    private choose(choice: DialogueChoice): void {
        this.close();
        choice.onSelect();
    }

    private renderPage(): void {
        const shown = revealLines(this.pages[this.pageIndex], visibleCharacters(this.elapsedMs));

        this.lines.forEach((line, i) => line.setText(shown[i] ?? ''));
    }

    private pageComplete(): boolean {
        return visibleCharacters(this.elapsedMs) >= pageLength(this.pages[this.pageIndex]);
    }

    private onLastPage(): boolean {
        return this.pageIndex === this.pages.length - 1;
    }

    private hasChoices(): boolean {
        return (this.request?.choices?.length ?? 0) > 0;
    }

    private show(): void {
        this.setVisible(true);
        this.blocker.setInteractive();
    }

    private hide(): void {
        this.setVisible(false);
        this.blocker.disableInteractive();
    }

    private setVisible(visible: boolean): void {
        this.panel.setVisible(visible);
        this.tab.setVisible(visible);
        this.speaker.setVisible(visible);
        this.lines.forEach((line) => line.setVisible(visible));
        this.more.setVisible(false);
    }
}
