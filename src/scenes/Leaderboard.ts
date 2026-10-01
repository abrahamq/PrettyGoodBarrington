// Leaderboard screen: the top 10 players from the Rails server (rank, name, stamps, tips), this device's
// rank, and SUBMIT (send this save's stamps and tips) and BACK. The first SUBMIT opens NameEntry.
// The game does not need the server: when it is down, the board says CAN'T REACH THE BOARD.
// Enter submits; Escape or Backspace goes back to the Title menu.
import { Scene, type GameObjects } from 'phaser';
import { TEXTURES } from '../art/textures.ts';
import { CENTER_X } from '../layout.ts';
import { formatDollars } from '../logic/orderUp.ts';
import { leaderboardClient, type Board, type BoardEntry, type LeaderboardClient } from '../net/leaderboardClient.ts';
import { errorMessage } from '../net/leaderboardMessages.ts';
import { colorNumber } from '../palette.ts';
import { forgetIdentity, loadIdentity } from '../state/leaderboardIdentity.ts';
import { leaderboardProgress } from '../state/progress.ts';
import { hasSave, loadSave } from '../state/save.ts';
import { Button } from '../ui/Button.ts';
import { PANEL_BORDER, Panel } from '../ui/Panel.ts';
import { StatusLine } from '../ui/StatusLine.ts';
import { addPixelText, addShadowedText, centeredX, pixelTextWidth } from '../ui/text.ts';

export interface LeaderboardData {
    message?: string;
}

const PANEL_X = 8;
const PANEL_Y = 22;
const PANEL_WIDTH = 224;
const PANEL_HEIGHT = 110;
const ROW_TOP = PANEL_Y + PANEL_BORDER + 2;
const ROW_HEIGHT = 10;
const ROW_LEFT = PANEL_X + PANEL_BORDER + 3;
const ROW_RIGHT = PANEL_X + PANEL_WIDTH - PANEL_BORDER - 3;
const NAME_X = ROW_LEFT + 24;
const STAMP_X = ROW_LEFT + 112;
const STATUS_Y = 134;
const BUTTON_Y = 145;
const BUTTON_WIDTH = 72;
const BUTTON_HEIGHT = 14;

export class Leaderboard extends Scene {
    private client: LeaderboardClient;
    private boardObjects: GameObjects.GameObject[] = [];
    private status: StatusLine;
    private sending = false;
    // Counts visits to this screen, so a reply that arrives after the player left (or came back) is ignored.
    private visit = 0;

    constructor() {
        super('Leaderboard');
    }

    create(data: LeaderboardData): void {
        this.visit += 1;
        this.sending = false;
        this.boardObjects = [];
        this.client = leaderboardClient();

        this.add.image(0, 0, TEXTURES.titleBackground).setOrigin(0);
        addShadowedText(this, centeredX('LEADERBOARD', CENTER_X, 16), 3, 'LEADERBOARD', 'cream', [
            { color: 'brick', offset: 2 },
            { color: 'ink', offset: 3 }
        ], 16);
        new Panel(this, PANEL_X, PANEL_Y, PANEL_WIDTH, PANEL_HEIGHT, { shadow: true });
        this.status = new StatusLine(this, STATUS_Y);
        this.addButtons();

        this.input.keyboard?.on('keydown', this.handleKey);
        this.events.once('shutdown', () => this.input.keyboard?.off('keydown', this.handleKey));

        void this.loadBoard(data.message);
    }

    private addButtons(): void {
        const back = () => this.scene.start('Title', { showMenu: true });

        if (!hasSave()) {
            new Button(this, CENTER_X - BUTTON_WIDTH / 2, BUTTON_Y, BUTTON_WIDTH, BUTTON_HEIGHT, 'BACK', 'secondary', back);
            return;
        }

        new Button(this, CENTER_X - BUTTON_WIDTH - 4, BUTTON_Y, BUTTON_WIDTH, BUTTON_HEIGHT, 'SUBMIT', 'primary', () => this.submit());
        new Button(this, CENTER_X + 4, BUTTON_Y, BUTTON_WIDTH, BUTTON_HEIGHT, 'BACK', 'secondary', back);
    }

    private readonly handleKey = (event: KeyboardEvent): void => {
        if (event.repeat) {
            return;
        }

        switch (event.code) {
            case 'Enter':
            case 'NumpadEnter':
                this.submit();
                break;
            case 'Escape':
            case 'Backspace':
                this.scene.start('Title', { showMenu: true });
                break;
        }
    };

    private async loadBoard(message?: string): Promise<void> {
        const visit = this.visit;
        const identity = loadIdentity();

        this.showNote('LOADING...');
        const result = await this.client.board(identity?.token ?? null);
        if (!this.stillHere(visit)) {
            return;
        }

        if (!result.ok) {
            this.showNote(errorMessage(result.error));
            this.setStatus(message ?? '');
            return;
        }

        this.drawBoard(result.value);
        this.setStatus(message ?? defaultStatus(result.value.you));
    }

    private submit(): void {
        const save = loadSave();
        const identity = loadIdentity();

        if (this.sending || !save) {
            return;
        }
        if (!identity) {
            this.scene.start('NameEntry');
            return;
        }

        const visit = this.visit;
        this.sending = true;
        this.setStatus('SENDING...');

        void this.client.submit(identity.token, leaderboardProgress(save)).then((result) => {
            if (!this.stillHere(visit)) {
                return;
            }
            this.sending = false;

            if (result.ok) {
                void this.loadBoard(`SENT! YOU ARE #${result.value.rank}`);
            } else if (result.error === 'unknown_player') {
                // The server no longer knows this device (for example, its database was reset), so pick a name again.
                forgetIdentity();
                this.scene.start('NameEntry');
            } else {
                this.setStatus(errorMessage(result.error));
            }
        });
    }

    private drawBoard(board: Board): void {
        this.clearBoard();

        if (board.players.length === 0) {
            this.showNote('NO ONE YET. BE THE FIRST!');
            return;
        }

        board.players.forEach((entry, index) => {
            this.drawRow(entry, ROW_TOP + index * ROW_HEIGHT, entry.name === board.you?.name);
        });
    }

    private drawRow(entry: BoardEntry, y: number, isYou: boolean): void {
        const color = isYou ? 'cream' : 'ink';
        const tips = formatDollars(entry.tipsCents);

        if (isYou) {
            const width = PANEL_WIDTH - PANEL_BORDER * 2;
            this.boardObjects.push(this.add.rectangle(PANEL_X + PANEL_BORDER, y, width, ROW_HEIGHT, colorNumber('ink')).setOrigin(0));
        }

        this.boardObjects.push(
            addPixelText(this, ROW_LEFT, y + 1, String(entry.rank).padStart(2), color),
            addPixelText(this, NAME_X, y + 1, entry.name, color),
            this.add.image(STAMP_X, y, TEXTURES.stamp).setOrigin(0),
            addPixelText(this, STAMP_X + 12, y + 1, String(entry.stamps), color),
            addPixelText(this, ROW_RIGHT - pixelTextWidth(tips), y + 1, tips, color)
        );
    }

    // One centered line in the board panel, in place of the rows: loading, empty, or an error.
    private showNote(text: string): void {
        this.clearBoard();
        const y = PANEL_Y + Math.round(PANEL_HEIGHT / 2) - 4;
        this.boardObjects.push(addPixelText(this, centeredX(text, CENTER_X), y, text, 'ink'));
    }

    private clearBoard(): void {
        this.boardObjects.forEach((object) => object.destroy());
        this.boardObjects = [];
    }

    private setStatus(text: string): void {
        this.status.show(text);
    }

    private stillHere(visit: number): boolean {
        return visit === this.visit && this.scene.isActive();
    }
}

function defaultStatus(you: BoardEntry | null): string {
    if (you) {
        return `YOU ARE #${you.rank}`;
    }
    return hasSave() ? 'SUBMIT TO JOIN THE BOARD' : 'PLAY FIRST, THEN SUBMIT';
}
