// Overworld scene: downtown Great Barrington. It draws the Tiled map, moves the player one tile at a time
// (arrow keys or WASD, the on-screen d-pad, or tap-to-walk along a path), and handles talking to shopkeepers,
// NPCs, and signs. It also runs the clock and its time-of-day tint, and starts minigames.
// The HUD and the dialogue box live in the UI scene, which runs on top of this one.
import { Scene, type GameObjects, type Input } from 'phaser';
import { PLAYER_FRAMES_PER_ROW, PLAYER_ROWS } from '../art/people.ts';
import { TEXTURES } from '../art/textures.ts';
import { LINES, STOP_SCRIPTS, fillNames } from '../data/dialogue.ts';
import { stopById, type StopId } from '../data/stops.ts';
import { GAME_HEIGHT, GAME_WIDTH, TILE_SIZE } from '../layout.ts';
import { advanceClock, tintAt, type ClockState } from '../logic/clock.ts';
import {
    DIRECTIONS, directionBetween, findPath, isWalkable, neighbor, sameTile, type Direction, type Tile
} from '../logic/grid.ts';
import { MAP_KEY } from '../map/files.ts';
import { interactableAt, readMap, zoneLabelAt, type Interactable, type MapInfo, type TiledMap } from '../map/tiled.ts';
import { TILESET_NAME } from '../map/tileset.ts';
import { colorHex, colorNumber, type ColorName } from '../palette.ts';
import { applyResult, isMinigameResult, type MinigameResult } from '../state/progress.ts';
import { writeSave, type SaveData } from '../state/save.ts';
import { currentSave, startSession } from '../state/session.ts';
import { addPixelText } from '../ui/text.ts';
import type { UI } from './UI.ts';

interface OverworldData {
    result?: unknown;
}

const STEP_MS = 200;
const SAVE_EVERY_GAME_MINUTES = 5;
const ACTION_KEYS = ['Space', 'Enter', 'NumpadEnter', 'KeyZ'];
const FACING_KEY = 'overworldFacing';
// Characters are 12 pixels wide, centered in a 16-pixel tile.
const CHARACTER_INSET = 2;

const DEPTH = { ground: 0, buildings: 1, player: 2, decor: 3, nameplates: 4, npcs: 5, tint: 10 };

const BOARDS: Record<string, { fill: ColorName; text: ColorName }> = {
    red: { fill: 'red', text: 'gold' },
    ink: { fill: 'ink', text: 'cream' },
    cream: { fill: 'whiteCream', text: 'brick' }
};

export class Overworld extends Scene {
    private save!: SaveData;
    private info!: MapInfo;
    private ui!: UI;
    private player!: GameObjects.Sprite;
    private tile!: Tile;
    private facing: Direction = 'down';
    private moving = false;
    private path: Tile[] = [];
    private target?: Interactable;
    private doorBumped = false;
    private clock!: ClockState;
    private minutesSinceSave = 0;
    private tint!: GameObjects.Rectangle;
    private keys!: Record<Direction, Input.Keyboard.Key[]>;
    private zone = '';

    constructor() {
        super('Overworld');
    }

    create(data: OverworldData): void {
        this.resetState();
        this.save = currentSave(this);

        const result = isMinigameResult(data?.result) ? data.result : undefined;
        if (result) {
            this.save = applyResult(this.save, result);
            startSession(this, this.save);
            writeSave(this.save);
        }

        this.info = readMap(this.cache.tilemap.get(MAP_KEY).data as TiledMap);
        this.drawMap();
        this.drawNameplates();
        this.drawNpcs();

        this.tile = this.startTile();
        this.facing = (this.registry.get(FACING_KEY) as Direction | undefined) ?? 'down';
        this.player = this.add.sprite(...pixelOf(this.tile), TEXTURES.player, idleFrame(this.facing))
            .setOrigin(0)
            .setDepth(DEPTH.player);
        createWalkAnimations(this);
        this.setUpCamera();

        this.tint = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0, 0).setOrigin(0).setScrollFactor(0).setDepth(DEPTH.tint);
        this.clock = { dayMinutes: this.save.dayMinutes, carryMs: 0 };
        this.applyTint();

        this.setUpInput();
        this.startUi(() => {
            this.updateZone(true);
            if (result) {
                this.showResultLine(result);
            }
        });
    }

    update(_time: number, deltaMs: number): void {
        this.tickClock(deltaMs);

        if (this.moving || this.ui.isBusy()) {
            return;
        }

        if (this.ui.takeTouchAction()) {
            this.interactFacing();
            return;
        }

        const direction = this.heldDirection();
        if (direction) {
            this.path = [];
            this.target = undefined;
            this.tryStep(direction);
            return;
        }

        this.doorBumped = false;
        this.followPath();
    }

    private resetState(): void {
        this.moving = false;
        this.path = [];
        this.target = undefined;
        this.doorBumped = false;
        this.minutesSinceSave = 0;
        this.zone = '';
    }

    // Movement

    private heldDirection(): Direction | null {
        return DIRECTIONS.find((direction) => this.keys[direction].some((key) => key.isDown))
            ?? this.ui.touchDirection();
    }

    private tryStep(direction: Direction): void {
        this.face(direction);
        const next = neighbor(this.tile, direction);

        if (isWalkable(this.info.grid, next)) {
            this.doorBumped = false;
            this.walkTo(next);
            return;
        }

        this.standStill();

        // Walking into a door opens its dialogue, but only once until the player lets go or moves away.
        const item = interactableAt(this.info, next);
        if (item?.kind === 'door' && !this.doorBumped) {
            this.doorBumped = true;
            this.interact(item);
        }
    }

    private followPath(): void {
        const next = this.path.shift();

        if (!next) {
            this.arriveAtTarget();
            return;
        }

        this.face(directionBetween(this.tile, next));
        if (isWalkable(this.info.grid, next)) {
            this.walkTo(next);
        } else {
            this.path = [];
            this.target = undefined;
        }
    }

    private walkTo(next: Tile): void {
        const [x, y] = pixelOf(next);

        this.moving = true;
        this.player.anims.play(`walk-${this.facing}`, true);
        this.tweens.add({
            targets: this.player,
            x,
            y,
            duration: STEP_MS,
            onComplete: () => this.finishStep(next)
        });
    }

    private finishStep(next: Tile): void {
        this.tile = next;
        this.moving = false;
        this.save.lastPosition = { x: next.col * TILE_SIZE, y: next.row * TILE_SIZE };
        writeSave(this.save);
        this.updateZone();

        if (this.path.length === 0 && !this.heldDirection()) {
            this.standStill();
            this.arriveAtTarget();
        }
    }

    private arriveAtTarget(): void {
        const target = this.target;
        this.target = undefined;

        if (target) {
            this.faceToward(target);
            this.interact(target);
        }
    }

    private face(direction: Direction): void {
        this.facing = direction;
        if (!this.moving) {
            this.player.setFrame(idleFrame(direction));
        }
    }

    private faceToward(item: Interactable): void {
        const direction = DIRECTIONS.find((d) => covers(item, neighbor(this.tile, d)));
        if (direction) {
            this.face(direction);
        }
    }

    private standStill(): void {
        this.player.anims.stop();
        this.player.setFrame(idleFrame(this.facing));
    }

    // Tap-to-walk: walk to the tapped tile, or up to the tapped door, NPC, or sign and then talk to it.
    private readonly handleTap = (pointer: Input.Pointer, tappedObjects: GameObjects.GameObject[]): void => {
        if (tappedObjects.length > 0 || this.ui.isBusy()) {
            return;
        }

        const tapped = { col: Math.floor(pointer.worldX / TILE_SIZE), row: Math.floor(pointer.worldY / TILE_SIZE) };
        const item = interactableAt(this.info, tapped);
        const path = findPath(this.info.grid, this.tile, item ? standingSpots(item) : [tapped]);

        if (path === null) {
            return;
        }

        this.path = path;
        this.target = item;
        if (!this.moving && path.length === 0) {
            this.arriveAtTarget();
        }
    };

    // Talking

    private readonly handleKey = (event: KeyboardEvent): void => {
        if (event.repeat || this.ui.isBusy() || this.moving) {
            return;
        }

        if (ACTION_KEYS.includes(event.code)) {
            this.interactFacing();
        } else if (event.code === 'KeyP') {
            this.ui.showPassport();
        } else if (event.code === 'Escape') {
            this.backToTitle();
        }
    };

    private interactFacing(): void {
        const item = interactableAt(this.info, neighbor(this.tile, this.facing));
        if (item) {
            this.interact(item);
        }
    }

    private interact(item: Interactable): void {
        if (item.stopId) {
            this.talkToStop(item.stopId);
            return;
        }

        const line = item.dialogueId ? LINES[item.dialogueId] : undefined;
        if (line) {
            this.ui.showDialogue({ speaker: line.speaker, paragraphs: line.text.map(fillNames) });
        }
    }

    private talkToStop(stopId: StopId): void {
        const script = STOP_SCRIPTS[stopId];

        if (script.kind === 'stub') {
            this.ui.showDialogue({ speaker: script.speaker, paragraphs: script.text.map(fillNames) });
            return;
        }

        const lines = this.save.stamps[stopId] ? script.again : script.intro;
        this.ui.showDialogue({
            speaker: script.speaker,
            paragraphs: lines.map(fillNames),
            choices: [
                { label: script.accept, onSelect: () => this.startMinigame(stopId) },
                { label: script.decline, onSelect: () => undefined }
            ]
        });
    }

    private showResultLine(result: MinigameResult): void {
        const script = STOP_SCRIPTS[result.stopId];

        if (script.kind === 'playable') {
            this.ui.showDialogue({ speaker: script.speaker, paragraphs: (result.passed ? script.win : script.lose).map(fillNames) });
        }
    }

    // Leaving the street

    private startMinigame(stopId: StopId): void {
        const sceneKey = stopById(stopId).minigame;
        if (!sceneKey) {
            return;
        }

        this.leave();
        this.scene.start(sceneKey, { stopId });
    }

    private backToTitle(): void {
        this.leave();
        this.scene.start('Title', { showMenu: true });
    }

    private leave(): void {
        this.save.dayMinutes = this.clock.dayMinutes;
        writeSave(this.save);
        this.registry.set(FACING_KEY, this.facing);
        this.input.keyboard?.off('keydown', this.handleKey);
        this.input.off('pointerdown', this.handleTap);
        this.scene.stop('UI');
    }

    // Clock and street name

    private tickClock(deltaMs: number): void {
        const next = advanceClock(this.clock, deltaMs);

        if (next.dayMinutes !== this.clock.dayMinutes) {
            this.save.dayMinutes = next.dayMinutes;
            this.minutesSinceSave += next.dayMinutes - this.clock.dayMinutes;
            if (this.minutesSinceSave >= SAVE_EVERY_GAME_MINUTES) {
                this.minutesSinceSave = 0;
                writeSave(this.save);
            }
        }

        this.clock = next;
        this.applyTint();
    }

    private applyTint(): void {
        const { color, alpha } = tintAt(this.clock.dayMinutes);
        this.tint.setFillStyle(color, alpha);
    }

    private updateZone(force = false): void {
        const zone = zoneLabelAt(this.info, this.tile);

        if (force || zone !== this.zone) {
            this.zone = zone;
            this.ui.setLocation(zone);
        }
    }

    // Setup

    private startTile(): Tile {
        const saved = this.save.lastPosition;

        if (saved) {
            const tile = { col: Math.floor(saved.x / TILE_SIZE), row: Math.floor(saved.y / TILE_SIZE) };
            if (isWalkable(this.info.grid, tile)) {
                return tile;
            }
        }

        return this.info.spawn;
    }

    private drawMap(): void {
        const map = this.make.tilemap({ key: MAP_KEY });
        const tileset = map.addTilesetImage(TILESET_NAME, TEXTURES.tiles);

        if (!tileset) {
            throw new Error(`The map has no tileset named "${TILESET_NAME}".`);
        }

        map.createLayer('ground', tileset)?.setDepth(DEPTH.ground);
        map.createLayer('buildings', tileset)?.setDepth(DEPTH.buildings);
        map.createLayer('decor', tileset)?.setDepth(DEPTH.decor);
    }

    private drawNameplates(): void {
        for (const plate of this.info.nameplates) {
            const colors = BOARDS[plate.board] ?? BOARDS.ink;

            this.add.rectangle(plate.x, plate.y, plate.width, plate.height, colorNumber('ink')).setOrigin(0).setDepth(DEPTH.nameplates);
            this.add.rectangle(plate.x + 1, plate.y + 1, plate.width - 2, plate.height - 2, colorNumber(colors.fill))
                .setOrigin(0)
                .setDepth(DEPTH.nameplates);
            addPixelText(this, plate.x + 4, plate.y + 2, stopById(plate.stopId).sign, colors.text).setDepth(DEPTH.nameplates);
        }
    }

    // Shopkeepers stand in the middle of their doorway; other NPCs stand on their own tile.
    private drawNpcs(): void {
        for (const item of this.info.interactables) {
            if (!item.npc || !this.textures.exists(item.npc)) {
                continue;
            }

            const tile = { col: item.col + Math.floor((item.width - 1) / 2), row: item.row + item.height - 1 };
            this.add.image(...pixelOf(tile), item.npc).setOrigin(0).setDepth(DEPTH.npcs);
        }
    }

    private setUpCamera(): void {
        const camera = this.cameras.main;

        camera.setBounds(0, 0, this.info.width * TILE_SIZE, this.info.height * TILE_SIZE);
        camera.startFollow(this.player, true);
        camera.setFollowOffset(-6, -8);
        camera.setBackgroundColor(colorHex('ink'));
    }

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
        this.input.on('pointerdown', this.handleTap);
    }

    private startUi(onReady: () => void): void {
        this.ui = this.scene.get('UI') as UI;
        this.ui.events.once('create', onReady);
        this.scene.launch('UI');
    }
}

function pixelOf(tile: Tile): [number, number] {
    return [tile.col * TILE_SIZE + CHARACTER_INSET, tile.row * TILE_SIZE];
}

function idleFrame(direction: Direction): number {
    return PLAYER_ROWS.indexOf(direction) * PLAYER_FRAMES_PER_ROW;
}

function covers(item: Interactable, tile: Tile): boolean {
    return tile.col >= item.col && tile.col < item.col + item.width
        && tile.row >= item.row && tile.row < item.row + item.height;
}

// Where the player can stand to talk: in front of a door (it faces south), or next to anything else.
function standingSpots(item: Interactable): Tile[] {
    const spots: Tile[] = [];

    for (let col = item.col; col < item.col + item.width; col++) {
        if (item.kind === 'door') {
            spots.push({ col, row: item.row + item.height });
            continue;
        }
        for (let row = item.row; row < item.row + item.height; row++) {
            for (const direction of DIRECTIONS) {
                const spot = neighbor({ col, row }, direction);
                if (!covers(item, spot) && !spots.some((s) => sameTile(s, spot))) {
                    spots.push(spot);
                }
            }
        }
    }

    return spots;
}

// Walk cycle: left foot, standing, right foot, standing.
function createWalkAnimations(scene: Scene): void {
    PLAYER_ROWS.forEach((row, index) => {
        const key = `walk-${row}`;
        const first = index * PLAYER_FRAMES_PER_ROW;

        if (!scene.anims.exists(key)) {
            scene.anims.create({
                key,
                frames: scene.anims.generateFrameNumbers(TEXTURES.player, { frames: [first + 1, first, first + 2, first] }),
                frameRate: 8,
                repeat: -1
            });
        }
    });
}
