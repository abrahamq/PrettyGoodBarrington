// Title screen, matching docs/mocks/Main.dc.html: the sunset backdrop, the logo, and the main menu
// (New Game, Continue, Options). It first shows a blinking PRESS START; the first key or tap opens the menu.
import { Scene } from 'phaser';
import { TEXTURES } from '../art/textures.ts';
import { CENTER_X } from '../layout.ts';
import { hasSave, loadSave, newSave, writeSave, type SaveData } from '../state/save.ts';
import { startSession } from '../state/session.ts';
import { onFirstInput } from '../ui/input.ts';
import { Menu } from '../ui/Menu.ts';
import { addPixelText, addShadowedText, centeredX } from '../ui/text.ts';

interface TitleData {
    showMenu?: boolean;
}

const TAGLINE = ['A downtown adventure', 'in the Berkshires'];
const MENU_TOP = 98;
const CONFIRM_TOP = 92;

export class Title extends Scene {
    private menu?: Menu;

    constructor() {
        super('Title');
    }

    create(data: TitleData): void {
        this.menu = undefined;
        this.add.image(0, 0, TEXTURES.titleBackground).setOrigin(0);
        addHeading(this);

        if (data.showMenu) {
            this.openMenu();
        } else {
            this.waitForStart();
        }
    }

    // This first tap or key press also unlocks audio: Phaser listens for it on the page (mobile browsers
    // block sound until the player touches the page).
    private waitForStart(): void {
        const prompt = addPixelText(this, centeredX('PRESS START', CENTER_X), 145, 'PRESS START', 'cream');
        const blink = this.time.addEvent({
            delay: 500,
            loop: true,
            callback: () => prompt.setVisible(!prompt.visible)
        });

        onFirstInput(this, () => {
            blink.remove();
            prompt.destroy();
            this.openMenu();
        });
    }

    private openMenu(): void {
        this.menu?.destroy();
        this.menu = new Menu(this, CENTER_X, MENU_TOP, [
            { label: 'NEW GAME', onSelect: () => this.newGame() },
            { label: 'CONTINUE', enabled: hasSave(), onSelect: () => this.continueGame() },
            { label: 'OPTIONS', onSelect: () => this.scene.start('Options') }
        ]);
    }

    private newGame(): void {
        if (!hasSave()) {
            this.beginGame(newSave());
            return;
        }

        this.menu?.destroy();
        this.menu = new Menu(this, CENTER_X, CONFIRM_TOP, [
            { label: 'NO', onSelect: () => this.openMenu() },
            { label: 'YES', onSelect: () => this.beginGame(newSave()) }
        ], {
            heading: ['ERASE YOUR SAVE', 'AND START OVER?'],
            onCancel: () => this.openMenu()
        });
    }

    private continueGame(): void {
        const save = loadSave();

        if (save) {
            this.beginGame(save);
        }
    }

    private beginGame(save: SaveData): void {
        writeSave(save);
        startSession(this, save);
        this.scene.start('Overworld');
    }
}

function addHeading(scene: Scene): void {
    const place = 'GREAT BARRINGTON';
    addShadowedText(scene, centeredX(place, CENTER_X), 14, place, 'sunlight', [{ color: 'ink', offset: 1 }]);

    addLogoLine(scene, 'MAIN STREET', 26);
    addLogoLine(scene, 'QUEST', 44);
    addTagline(scene, 66);
}

function addLogoLine(scene: Scene, text: string, y: number): void {
    const shadows = [{ color: 'brick', offset: 2 }, { color: 'ink', offset: 3 }] as const;
    addShadowedText(scene, centeredX(text, CENTER_X, 16), y, text, 'cream', [...shadows], 16);
}

// The mockup puts the tagline on one line in a dark box. At 8px it is 304 pixels wide, wider than the
// screen, so it takes two lines, and a hard shadow replaces the box so the sun stays visible.
function addTagline(scene: Scene, top: number): void {
    TAGLINE.forEach((line, index) => {
        addShadowedText(scene, centeredX(line, CENTER_X), top + index * 10, line, 'cream', [{ color: 'ink', offset: 1 }]);
    });
}
