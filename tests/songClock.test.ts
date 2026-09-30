// Checks how song time comes from the audio clock, including taps that happened a moment before we read them,
// and the player's calibration offset.
import { describe, expect, it } from 'vitest';
import { eventSongTimeMs, songTimeMs } from '../src/audio/songClock.ts';

describe('songTimeMs', () => {
    it('counts milliseconds since the song started on the audio clock', () => {
        expect(songTimeMs(10.5, 10, 0)).toBeCloseTo(500);
    });

    it('subtracts the calibration offset, so late-sounding audio is judged fairly', () => {
        expect(songTimeMs(10.5, 10, 30)).toBeCloseTo(470);
    });
});

describe('eventSongTimeMs', () => {
    it('places a tap at the moment it happened, not the moment the game read it', () => {
        // The tap happened 20 ms before now.
        expect(eventSongTimeMs(10.5, 5000, 4980, 10, 0)).toBeCloseTo(480);
        expect(eventSongTimeMs(10.5, 5000, 4980, 10, 30)).toBeCloseTo(450);
    });
});
