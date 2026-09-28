// A stand-in for a minigame that is not built yet (Scoop Stack, Order Up!, Curtain Call).
// It tests the trip from the street to a minigame and back: WIN stamps the passport,
// LOSE and QUIT do not. Each real minigame replaces its placeholder in a later phase.
import { Scene } from 'phaser';
import { stopById, type StopId } from '../../data/stops.ts';
import { CENTER_X } from '../../layout.ts';
import type { MinigameResult } from '../../state/progress.ts';
import { Menu } from '../../ui/Menu.ts';
import { addShadowedText, centeredX } from '../../ui/text.ts';

interface PlaceholderData {
    stopId: StopId;
}

export class MinigamePlaceholder extends Scene {
    private readonly title: string;
    private readonly phase: number;

    constructor(key: string, title: string, phase: number) {
        super(key);
        this.title = title;
        this.phase = phase;
    }

    create(data: PlaceholderData): void {
        const stopId = data.stopId;

        addShadowedText(this, centeredX(this.title, CENTER_X, 16), 16, this.title, 'cream', [
            { color: 'brick', offset: 2 },
            { color: 'ink', offset: 3 }
        ], 16);

        new Menu(this, CENTER_X, 48, [
            { label: 'WIN', onSelect: () => this.finish({ stopId, passed: true, score: 100 }) },
            { label: 'LOSE', onSelect: () => this.finish({ stopId, passed: false, score: 10 }) },
            { label: 'QUIT', onSelect: () => this.finish({ stopId, passed: false, score: 0 }) }
        ], {
            heading: [stopById(stopId).sign, `COMING IN PHASE ${this.phase}`],
            onCancel: () => this.finish({ stopId, passed: false, score: 0 })
        });
    }

    private finish(result: MinigameResult): void {
        this.scene.start('Overworld', { result });
    }
}
