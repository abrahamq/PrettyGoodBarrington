// Arcade-style name picker for the leaderboard: a grid of letters and digits plus SPACE, DEL, BACK, and OK.
// Arrow keys move and Enter picks the highlighted square; typing on a keyboard works too (and jumps to OK,
// so Enter then sends the name). OK sends the name and this save's progress, then opens the Leaderboard.
import { Scene, type GameObjects, type Types } from 'phaser';
import { TEXTURES } from '../art/textures.ts';
import { CENTER_X } from '../layout.ts';
import {
    GRID_COLUMNS, GRID_ROWS, NAME_GRID, cellAt, deleteChar, moveCursor, typeChar, type GridCell, type GridCursor
} from '../logic/nameEntry.ts';
import { NAME_MAX_LENGTH, leaderboardClient, nameProblem, tidyName } from '../net/leaderboardClient.ts';
import { errorMessage, nameProblemMessage } from '../net/leaderboardMessages.ts';
import { colorHex, colorNumber } from '../palette.ts';
import { saveIdentity } from '../state/leaderboardIdentity.ts';
import { leaderboardProgress } from '../state/progress.ts';
import { loadSave } from '../state/save.ts';
import { PANEL_BORDER, Panel } from '../ui/Panel.ts';
import { StatusLine } from '../ui/StatusLine.ts';
import { addPixelText, addShadowedText, centeredX } from '../ui/text.ts';

const NAME_PANEL_Y = 24;
const NAME_PANEL_WIDTH = NAME_MAX_LENGTH * 16 + 12;
const NAME_PANEL_HEIGHT = 24;
const CELL_WIDTH = 20;
const CELL_HEIGHT = 15;
const GRID_PADDING = 2;
const GRID_INSET = PANEL_BORDER + GRID_PADDING;
const GRID_PANEL_WIDTH = GRID_COLUMNS * CELL_WIDTH + GRID_INSET * 2;
const GRID_PANEL_HEIGHT = GRID_ROWS * CELL_HEIGHT + GRID_INSET * 2;
const GRID_PANEL_X = Math.round(CENTER_X - GRID_PANEL_WIDTH / 2);
const GRID_PANEL_Y = 52;
const MESSAGE_Y = 144;
const OK_CURSOR: GridCursor = { row: 4, col: 7 };

interface CellView {
    cell: GridCell;
    highlight: GameObjects.Rectangle;
    label: GameObjects.Text;
}

export class NameEntry extends Scene {
    private name = '';
    private cursor: GridCursor = { row: 0, col: 0 };
    private nameText: GameObjects.Text;
    private message: StatusLine;
    private cells: CellView[] = [];
    private sending = false;
    // Counts visits to this screen, so a reply that arrives after the player left is ignored.
    private visit = 0;

    constructor() {
        super('NameEntry');
    }

    create(): void {
        this.visit += 1;
        this.name = '';
        this.cursor = { row: 0, col: 0 };
        this.cells = [];
        this.sending = false;

        this.add.image(0, 0, TEXTURES.titleBackground).setOrigin(0);
        addShadowedText(this, centeredX('PICK A NAME', CENTER_X, 16), 3, 'PICK A NAME', 'cream', [
            { color: 'brick', offset: 2 },
            { color: 'ink', offset: 3 }
        ], 16);

        new Panel(this, Math.round(CENTER_X - NAME_PANEL_WIDTH / 2), NAME_PANEL_Y, NAME_PANEL_WIDTH, NAME_PANEL_HEIGHT, { shadow: true });
        this.nameText = addPixelText(this, centeredX('', CENTER_X, 16), NAME_PANEL_Y + 5, '', 'ink', 16);

        new Panel(this, GRID_PANEL_X, GRID_PANEL_Y, GRID_PANEL_WIDTH, GRID_PANEL_HEIGHT, { shadow: true });
        NAME_GRID.forEach((cell) => this.addCell(cell));

        this.message = new StatusLine(this, MESSAGE_Y);

        this.input.keyboard?.on('keydown', this.handleKey);
        this.events.once('shutdown', () => this.input.keyboard?.off('keydown', this.handleKey));

        this.showName();
        this.showCursor();
    }

    private addCell(cell: GridCell): void {
        const x = GRID_PANEL_X + GRID_INSET + cell.col * CELL_WIDTH;
        const y = GRID_PANEL_Y + GRID_INSET + cell.row * CELL_HEIGHT;
        const width = cell.span * CELL_WIDTH;

        // The wide action squares get a parchment face, so they read as buttons.
        if (cell.action !== 'type') {
            this.add.rectangle(x + 1, y + 1, width - 2, CELL_HEIGHT - 2, colorNumber('parchment')).setOrigin(0);
        }

        const highlight = this.add.rectangle(x, y, width, CELL_HEIGHT, colorNumber('ink')).setOrigin(0);
        const label = addPixelText(this, centeredX(cell.label, x + width / 2), y + 4, cell.label, 'ink');
        const zone = this.add.zone(x, y, width, CELL_HEIGHT).setOrigin(0).setInteractive({ useHandCursor: true });

        zone.on('pointerdown', (_pointer: unknown, _x: number, _y: number, event: Types.Input.EventData) => {
            event.stopPropagation();
            this.cursor = { row: cell.row, col: cell.col };
            this.showCursor();
            this.activate(cell);
        });
        this.cells.push({ cell, highlight, label });
    }

    private readonly handleKey = (event: KeyboardEvent): void => {
        switch (event.code) {
            case 'ArrowLeft':
                this.move(-1, 0);
                return;
            case 'ArrowRight':
                this.move(1, 0);
                return;
            case 'ArrowUp':
                this.move(0, -1);
                return;
            case 'ArrowDown':
                this.move(0, 1);
                return;
            case 'Enter':
            case 'NumpadEnter':
                if (!event.repeat) {
                    this.activate(cellAt(this.cursor));
                }
                return;
            case 'Escape':
                this.scene.start('Leaderboard');
                return;
            case 'Backspace':
                this.setName(deleteChar(this.name));
                return;
        }

        if (event.key.length === 1) {
            this.setName(typeChar(this.name, event.key));
            this.cursor = OK_CURSOR;
            this.showCursor();
        }
    };

    private move(dx: -1 | 0 | 1, dy: -1 | 0 | 1): void {
        this.cursor = moveCursor(this.cursor, dx, dy);
        this.showCursor();
    }

    private activate(cell: GridCell): void {
        switch (cell.action) {
            case 'type':
                this.setName(typeChar(this.name, cell.label));
                break;
            case 'space':
                this.setName(typeChar(this.name, ' '));
                break;
            case 'delete':
                this.setName(deleteChar(this.name));
                break;
            case 'back':
                this.scene.start('Leaderboard');
                break;
            case 'ok':
                this.send();
                break;
        }
    }

    private send(): void {
        const save = loadSave();
        const problem = nameProblem(this.name);

        if (this.sending) {
            return;
        }
        if (!save) {
            this.scene.start('Leaderboard');
            return;
        }
        if (problem) {
            this.setMessage(nameProblemMessage(problem));
            return;
        }

        const visit = this.visit;
        this.sending = true;
        this.setMessage('SENDING...');

        void leaderboardClient().join(tidyName(this.name), leaderboardProgress(save)).then((result) => {
            if (visit !== this.visit || !this.scene.isActive()) {
                return;
            }
            this.sending = false;

            if (result.ok) {
                saveIdentity({ name: result.value.you.name, token: result.value.token });
                this.scene.start('Leaderboard', { message: `WELCOME! YOU ARE #${result.value.you.rank}` });
            } else {
                this.setMessage(errorMessage(result.error));
            }
        });
    }

    private setName(name: string): void {
        this.name = name;
        this.setMessage('');
        this.showName();
    }

    // Empty slots show as underscores, so the player can see how many characters are left.
    private showName(): void {
        const shown = this.name.padEnd(NAME_MAX_LENGTH, '_');
        this.nameText.setText(shown);
        this.nameText.x = centeredX(shown, CENTER_X, 16);
    }

    private showCursor(): void {
        const selected = cellAt(this.cursor);

        for (const view of this.cells) {
            const isSelected = view.cell === selected;
            view.highlight.setVisible(isSelected);
            view.label.setColor(colorHex(isSelected ? 'cream' : 'ink'));
        }
    }

    private setMessage(text: string): void {
        this.message.show(text);
    }
}
