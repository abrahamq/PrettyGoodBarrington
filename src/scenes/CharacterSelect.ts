// Character Select: before a new game, the player picks one of the three boys. There are no names or ages:
// each boy stands on his own card at 3x size, so the height difference shows. The chosen boy walks in place.
// Left/Right moves, Space/Enter/Z/A picks, Escape/Backspace/X/B goes back to the Title menu.
// On touch, tap a card to choose that boy, then tap it again or tap [A] GO.
import { Scene, type GameObjects } from 'phaser';
import { playerTextureKey, walkAnimationKey } from '../art/people.ts';
import { TEXTURES } from '../art/textures.ts';
import { CHARACTER_IDS, DEFAULT_CHARACTER, type CharacterId } from '../data/characters.ts';
import { CENTER_X } from '../layout.ts';
import { newSave } from '../state/save.ts';
import { startGame } from '../state/session.ts';
import { Button } from '../ui/Button.ts';
import { Panel } from '../ui/Panel.ts';
import { addShadowedText, centeredX } from '../ui/text.ts';

const HEADING = "WHO'S PLAYING?";
const SCALE = 3;
const SLOT_SPACING = 72;
const CARD = { width: 56, height: 70, top: 42 };
const FEET_Y = CARD.top + CARD.height - 8;
const ARROW_Y = CARD.top - 8;
const ACT_KEYS = ['Space', 'Enter', 'NumpadEnter', 'KeyZ', 'KeyA'];
const BACK_KEYS = ['Escape', 'Backspace', 'KeyX', 'KeyB'];

interface Slot {
    character: CharacterId;
    boy: GameObjects.Sprite;
}

export class CharacterSelect extends Scene {
    private slots: Slot[] = [];
    private arrow!: GameObjects.Image;
    private selected = 0;

    constructor() {
        super('CharacterSelect');
    }

    create(): void {
        this.add.image(0, 0, TEXTURES.titleBackground).setOrigin(0);
        addShadowedText(this, centeredX(HEADING, CENTER_X, 16), 12, HEADING, 'cream', [
            { color: 'brick', offset: 2 },
            { color: 'ink', offset: 3 }
        ], 16);

        this.slots = CHARACTER_IDS.map((character, index) => this.addSlot(character, index));
        this.arrow = this.add.image(0, ARROW_Y, TEXTURES.pickArrow).setOrigin(0);

        new Button(this, 20, 131, 76, 14, '[B] BACK', 'secondary', () => this.back());
        new Button(this, 144, 128, 76, 17, '[A] GO', 'primary', () => this.pick());

        this.input.keyboard?.on('keydown', this.handleKey);
        this.events.once('shutdown', () => this.input.keyboard?.off('keydown', this.handleKey));

        this.select(CHARACTER_IDS.indexOf(DEFAULT_CHARACTER));
    }

    private addSlot(character: CharacterId, index: number): Slot {
        const centerX = slotCenterX(index);
        const left = centerX - CARD.width / 2;

        new Panel(this, left, CARD.top, CARD.width, CARD.height, { shadow: true });
        const boy = this.add.sprite(centerX, FEET_Y, playerTextureKey(character), 0)
            .setOrigin(0.5, 1)
            .setScale(SCALE);

        this.add.zone(left, CARD.top, CARD.width, CARD.height)
            .setOrigin(0)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => this.tapSlot(index));

        return { character, boy };
    }

    private readonly handleKey = (event: KeyboardEvent): void => {
        // Holding Enter from the Title menu must not pick a boy the moment this screen opens.
        if (event.repeat) {
            return;
        }

        if (event.code === 'ArrowLeft') {
            this.select((this.selected + this.slots.length - 1) % this.slots.length);
        } else if (event.code === 'ArrowRight') {
            this.select((this.selected + 1) % this.slots.length);
        } else if (ACT_KEYS.includes(event.code)) {
            this.pick();
        } else if (BACK_KEYS.includes(event.code)) {
            this.back();
        }
    };

    private tapSlot(index: number): void {
        if (index === this.selected) {
            this.pick();
        } else {
            this.select(index);
        }
    }

    private select(index: number): void {
        this.selected = index;

        this.slots.forEach((slot, i) => {
            if (i === index) {
                slot.boy.anims.play(walkAnimationKey(slot.character, 'down'));
            } else {
                slot.boy.anims.stop();
                slot.boy.setFrame(0);
            }
        });

        this.arrow.setX(slotCenterX(index) - Math.floor(this.arrow.width / 2));
    }

    private pick(): void {
        startGame(this, newSave(this.slots[this.selected].character));
    }

    private back(): void {
        this.scene.start('Title', { showMenu: true });
    }
}

function slotCenterX(index: number): number {
    return CENTER_X + (index - (CHARACTER_IDS.length - 1) / 2) * SLOT_SPACING;
}
