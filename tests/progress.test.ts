// Checks how a finished minigame changes the save: stamps, best scores, and the stamp count.
import { describe, expect, it } from 'vitest';
import { applyResult, isMinigameResult, stampCount } from '../src/state/progress.ts';
import { newSave } from '../src/state/save.ts';

describe('applyResult', () => {
    it('stamps the passport and records the score on a win', () => {
        const save = applyResult(newSave(), { stopId: 'soco', passed: true, score: 5 });

        expect(save.stamps.soco).toBe(true);
        expect(save.bestScores.soco).toBe(5);
    });

    it('does not stamp on a loss, but still keeps the best score', () => {
        const save = applyResult(newSave(), { stopId: 'soco', passed: false, score: 3 });

        expect(save.stamps.soco).toBe(false);
        expect(save.bestScores.soco).toBe(3);
    });

    it('never removes a stamp or lowers a best score', () => {
        const won = applyResult(newSave(), { stopId: 'gbeats', passed: true, score: 14 });
        const later = applyResult(won, { stopId: 'gbeats', passed: false, score: 2 });

        expect(later.stamps.gbeats).toBe(true);
        expect(later.bestScores.gbeats).toBe(14);
    });

    it('does not change the save it was given', () => {
        const save = newSave();
        applyResult(save, { stopId: 'soco', passed: true, score: 5 });

        expect(save.stamps.soco).toBe(false);
        expect(save.bestScores).toEqual({});
    });
});

describe('stampCount', () => {
    it('counts the stamped stops', () => {
        const save = newSave();
        save.stamps.soco = true;
        save.stamps.mahaiwe = true;

        expect(stampCount(save)).toBe(2);
    });
});

describe('isMinigameResult', () => {
    it('accepts a well-formed result', () => {
        expect(isMinigameResult({ stopId: 'soco', passed: true, score: 5 })).toBe(true);
    });

    it('rejects anything else', () => {
        expect(isMinigameResult(undefined)).toBe(false);
        expect(isMinigameResult({ stopId: 'pizzaPlanet', passed: true, score: 5 })).toBe(false);
        expect(isMinigameResult({ stopId: 'soco', passed: 'yes', score: 5 })).toBe(false);
    });
});
