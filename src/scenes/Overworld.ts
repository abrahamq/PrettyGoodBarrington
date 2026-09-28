// Overworld scene, Phase 1 placeholder: a grass field with a box that stands in for the player.
// It exists to prove that saving works: each step is saved, and Continue puts the box back where you left it.
// Phase 2 replaces this scene with the real map, camera, and dialogue.
import { Scene, type GameObjects, type Input } from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, TILE_SIZE } from '../layout.ts';
import { colorNumber } from '../palette.ts';
import { writeSave, type Position, type SaveData } from '../state/save.ts';
import { currentSave } from '../state/session.ts';
import { Panel } from '../ui/Panel.ts';
import { addPixelText, centeredX, pixelTextWidth } from '../ui/text.ts';

interface Tile {
    column: number;
    row: number;
}

const COLUMNS = GAME_WIDTH / TILE_SIZE;
const ROWS = GAME_HEIGHT / TILE_SIZE;
const START_TILE: Tile = { column: 7, row: 5 };
const HINT = 'MOVE: ARROWS OR TAP';

export class Overworld extends Scene {
    private save!: SaveData;
    private tile!: Tile;
    private player!: GameObjects.Container;
    private tileLabel!: GameObjects.Text;

    constructor() {
        super('Overworld');
    }

    create(): void {
        this.save = currentSave(this);
        this.tile = this.save.lastPosition ? tileAt(this.save.lastPosition) : { ...START_TILE };

        drawField(this);
        this.player = this.addPlayer();
        this.tileLabel = this.addStatusPanel();
        this.addMenuButton();
        this.addHint();

        this.input.keyboard?.on('keydown', this.handleKey);
        this.input.on('pointerdown', this.handleTap);
    }

    private readonly handleKey = (event: KeyboardEvent): void => {
        switch (event.code) {
            case 'ArrowLeft':
            case 'KeyA':
                this.step(-1, 0);
                break;
            case 'ArrowRight':
            case 'KeyD':
                this.step(1, 0);
                break;
            case 'ArrowUp':
            case 'KeyW':
                this.step(0, -1);
                break;
            case 'ArrowDown':
            case 'KeyS':
                this.step(0, 1);
                break;
            case 'Escape':
                this.backToTitle();
                break;
        }
    };

    // Steps one tile toward the tap, along whichever axis is farther away.
    private readonly handleTap = (pointer: Input.Pointer, tappedObjects: GameObjects.GameObject[]): void => {
        if (tappedObjects.length > 0) {
            return;
        }

        const dx = pointer.x - (this.player.x + 6);
        const dy = pointer.y - (this.player.y + 8);

        if (Math.abs(dx) > Math.abs(dy)) {
            this.step(Math.sign(dx), 0);
        } else {
            this.step(0, Math.sign(dy));
        }
    };

    private step(columns: number, rows: number): void {
        const column = clamp(this.tile.column + columns, 0, COLUMNS - 1);
        const row = clamp(this.tile.row + rows, 0, ROWS - 1);

        if (column === this.tile.column && row === this.tile.row) {
            return;
        }

        this.tile = { column, row };
        this.player.setPosition(...playerPosition(this.tile));
        this.tileLabel.setText(tileText(this.tile));

        this.save.lastPosition = { x: column * TILE_SIZE, y: row * TILE_SIZE };
        writeSave(this.save);
    }

    private backToTitle(): void {
        writeSave(this.save);
        this.scene.start('Title', { showMenu: true });
    }

    private addPlayer(): GameObjects.Container {
        const outline = this.add.rectangle(0, 0, 12, 16, colorNumber('ink')).setOrigin(0);
        const body = this.add.rectangle(1, 1, 10, 14, colorNumber('brick')).setOrigin(0);
        const [x, y] = playerPosition(this.tile);

        return this.add.container(x, y, [outline, body]);
    }

    private addStatusPanel(): GameObjects.Text {
        const stamps = Object.values(this.save.stamps).filter(Boolean).length;

        new Panel(this, 4, 4, 94, 30);
        addPixelText(this, 11, 11, `STAMPS ${stamps}/8`, 'ink');

        return addPixelText(this, 11, 21, tileText(this.tile), 'ink');
    }

    private addMenuButton(): void {
        const width = pixelTextWidth('MENU') + 14;
        const left = GAME_WIDTH - 4 - width;

        new Panel(this, left, 4, width, 16);
        addPixelText(this, left + 7, 8, 'MENU', 'ink');
        this.add.zone(left, 4, width, 16).setOrigin(0).setInteractive({ useHandCursor: true })
            .on('pointerdown', () => this.backToTitle());
    }

    private addHint(): void {
        const width = pixelTextWidth(HINT) + 8;

        this.add.rectangle(Math.round(GAME_WIDTH / 2 - width / 2), GAME_HEIGHT - 16, width, 12, colorNumber('ink')).setOrigin(0);
        addPixelText(this, centeredX(HINT, GAME_WIDTH / 2), GAME_HEIGHT - 14, HINT, 'cream');
    }
}

function drawField(scene: Scene): void {
    const grid = scene.add.graphics();

    grid.fillStyle(colorNumber('grass'));
    grid.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    grid.fillStyle(colorNumber('grassDark'));

    for (let x = 0; x < GAME_WIDTH; x += TILE_SIZE) {
        grid.fillRect(x, 0, 1, GAME_HEIGHT);
    }
    for (let y = 0; y < GAME_HEIGHT; y += TILE_SIZE) {
        grid.fillRect(0, y, GAME_WIDTH, 1);
    }
}

// The player sprite is 12 wide, centered in its 16-wide tile.
function playerPosition(tile: Tile): [number, number] {
    return [tile.column * TILE_SIZE + 2, tile.row * TILE_SIZE];
}

function tileAt(position: Position): Tile {
    return {
        column: clamp(Math.floor(position.x / TILE_SIZE), 0, COLUMNS - 1),
        row: clamp(Math.floor(position.y / TILE_SIZE), 0, ROWS - 1)
    };
}

function tileText(tile: Tile): string {
    return `TILE ${tile.column},${tile.row}`;
}

function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
}
