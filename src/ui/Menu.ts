// A vertical menu inside a Panel, with optional heading lines above the items.
// Up/Down (or W/S) move the highlight, Enter or Space picks, Escape or Backspace calls onCancel.
// Tapping an item picks it at once. Disabled items are grey and skipped.
// Each row is 12 game pixels tall (48 screen pixels at 4x), a comfortable tap target.
import type { GameObjects, Scene } from 'phaser';
import { TEXTURES } from '../art/textures.ts';
import { colorHex, colorNumber, type ColorName } from '../palette.ts';
import { PANEL_BORDER, Panel } from './Panel.ts';
import { addPixelText, pixelTextWidth } from './text.ts';

export interface MenuItem {
    label: string;
    enabled?: boolean;
    onSelect: () => void;
}

export interface MenuOptions {
    heading?: string[];
    onCancel?: () => void;
}

const PADDING = 4;
const ROW_HEIGHT = 12;
const ROW_GAP = 1;
const HEADING_LINE_HEIGHT = 10;
const HEADING_GAP = 3;
const CURSOR_LEFT = 3;
const TEXT_LEFT = 12;
const TEXT_TOP = 2;

interface Row {
    item: MenuItem;
    y: number;
    highlight: GameObjects.Rectangle;
    label: GameObjects.Text;
    zone: GameObjects.Zone;
}

export class Menu {
    private readonly scene: Scene;
    private readonly panel: Panel;
    private readonly headingTexts: GameObjects.Text[] = [];
    private readonly rows: Row[] = [];
    private readonly cursor: GameObjects.Image;
    private readonly onCancel?: () => void;
    private selected = -1;
    private destroyed = false;

    constructor(scene: Scene, centerX: number, top: number, items: MenuItem[], options: MenuOptions = {}) {
        this.scene = scene;
        this.onCancel = options.onCancel;

        const heading = options.heading ?? [];
        const inset = PANEL_BORDER + PADDING;
        const widestLabel = Math.max(...items.map((item) => pixelTextWidth(item.label)));
        const widestHeading = Math.max(0, ...heading.map((line) => pixelTextWidth(line)));
        const rowWidth = Math.max(TEXT_LEFT + widestLabel + CURSOR_LEFT, widestHeading);
        const headingHeight = heading.length > 0 ? heading.length * HEADING_LINE_HEIGHT + HEADING_GAP : 0;
        const rowsHeight = items.length * ROW_HEIGHT + (items.length - 1) * ROW_GAP;
        const width = rowWidth + inset * 2;
        const height = headingHeight + rowsHeight + inset * 2;
        const left = Math.round(centerX - width / 2);

        this.panel = new Panel(scene, left, top, width, height, { shadow: true });

        heading.forEach((line, index) => {
            const x = Math.round(left + width / 2 - pixelTextWidth(line) / 2);
            const y = top + inset + index * HEADING_LINE_HEIGHT;
            this.headingTexts.push(addPixelText(scene, x, y, line, 'ink'));
        });

        items.forEach((item, index) => {
            const x = left + inset;
            const y = top + inset + headingHeight + index * (ROW_HEIGHT + ROW_GAP);
            const highlight = scene.add.rectangle(x, y, rowWidth, ROW_HEIGHT, colorNumber('ink')).setOrigin(0);
            const label = addPixelText(scene, x + TEXT_LEFT, y + TEXT_TOP, item.label, 'ink');
            const zone = scene.add.zone(x, y, rowWidth, ROW_HEIGHT).setOrigin(0).setInteractive({ useHandCursor: true });

            zone.on('pointerdown', () => this.pick(index));
            this.rows.push({ item, y, highlight, label, zone });
        });

        this.cursor = scene.add.image(left + inset + CURSOR_LEFT, 0, TEXTURES.cursor).setOrigin(0);
        this.select(this.nextEnabled(-1, 1));

        scene.input.keyboard?.on('keydown', this.handleKey);
        scene.events.once('shutdown', this.destroy);
    }

    setLabel(index: number, text: string): void {
        this.rows[index].label.setText(text);
    }

    readonly destroy = (): void => {
        if (this.destroyed) {
            return;
        }
        this.destroyed = true;

        this.scene.input.keyboard?.off('keydown', this.handleKey);
        this.scene.events.off('shutdown', this.destroy);

        this.panel.destroy();
        this.headingTexts.forEach((text) => text.destroy());
        this.rows.forEach((row) => {
            row.highlight.destroy();
            row.label.destroy();
            row.zone.destroy();
        });
        this.cursor.destroy();
    };

    private readonly handleKey = (event: KeyboardEvent): void => {
        switch (event.code) {
            case 'ArrowUp':
            case 'KeyW':
                this.move(-1);
                break;
            case 'ArrowDown':
            case 'KeyS':
                this.move(1);
                break;
            case 'Enter':
            case 'NumpadEnter':
            case 'Space':
                this.pick(this.selected);
                break;
            case 'Escape':
            case 'Backspace':
                this.onCancel?.();
                break;
        }
    };

    private move(step: 1 | -1): void {
        const next = this.nextEnabled(this.selected, step);

        if (next !== -1) {
            this.select(next);
        }
    }

    private pick(index: number): void {
        const row = this.rows[index];

        if (this.destroyed || !row || !isEnabled(row.item)) {
            return;
        }

        this.select(index);
        row.item.onSelect();
    }

    private select(index: number): void {
        this.selected = index;

        this.rows.forEach((row, i) => {
            const isSelected = i === index;
            row.highlight.setVisible(isSelected);
            row.label.setColor(colorHex(labelColor(row.item, isSelected)));
        });

        const row = this.rows[index];
        this.cursor.setVisible(row !== undefined);
        if (row) {
            this.cursor.setY(row.y + TEXT_TOP);
        }
    }

    // Returns the index of the next enabled row after `from`, wrapping around, or -1 if none is enabled.
    private nextEnabled(from: number, step: 1 | -1): number {
        const count = this.rows.length;

        for (let k = 1; k <= count; k++) {
            const index = (((from + k * step) % count) + count) % count;

            if (isEnabled(this.rows[index].item)) {
                return index;
            }
        }

        return -1;
    }
}

function isEnabled(item: MenuItem): boolean {
    return item.enabled !== false;
}

function labelColor(item: MenuItem, isSelected: boolean): ColorName {
    if (!isEnabled(item)) {
        return 'road';
    }

    return isSelected ? 'cream' : 'ink';
}
