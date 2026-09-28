// Checks how dialogue text is wrapped into lines, split into pages, and revealed by the typewriter.
import { describe, expect, it } from 'vitest';
import { pagesFor, revealLines, visibleCharacters, wrapText } from '../src/logic/pages.ts';

describe('wrapText', () => {
    it('breaks lines between words', () => {
        expect(wrapText('Stack five scoops on one cone', 12)).toEqual(['Stack five', 'scoops on', 'one cone']);
    });

    it('fits a word that ends exactly at the limit', () => {
        expect(wrapText('abc defg', 8)).toEqual(['abc defg']);
    });

    it('splits a word that is longer than a whole line', () => {
        expect(wrapText('Aaaaaaaaaa!', 4)).toEqual(['Aaaa', 'aaaa', 'aa!']);
    });

    it('treats runs of spaces as one space', () => {
        expect(wrapText('  a   b  ', 10)).toEqual(['a b']);
    });
});

describe('pagesFor', () => {
    it('fills pages of up to three lines', () => {
        const pages = pagesFor(['one two three four five six seven'], 5, 3);

        expect(pages).toEqual([['one', 'two', 'three'], ['four', 'five', 'six'], ['seven']]);
    });

    it('starts each paragraph on a new page', () => {
        expect(pagesFor(['Hi!', 'Bye!'], 20, 3)).toEqual([['Hi!'], ['Bye!']]);
    });
});

describe('typewriter', () => {
    it('shows 40 characters per second', () => {
        expect(visibleCharacters(0)).toBe(0);
        expect(visibleCharacters(250)).toBe(10);
    });

    it('reveals a page one character at a time across its lines', () => {
        expect(revealLines(['abc', 'de'], 4)).toEqual(['abc', 'd']);
        expect(revealLines(['abc', 'de'], 99)).toEqual(['abc', 'de']);
        expect(revealLines(['abc', 'de'], 0)).toEqual(['', '']);
    });
});
