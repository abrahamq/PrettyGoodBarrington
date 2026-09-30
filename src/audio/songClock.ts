// Song time for Curtain Call, read from the audio clock so notes stay in sync with the music even when
// frames are slow. Taps are timed by when they happened (the browser event's timestamp), not when the game
// got around to reading them. The calibration offset shifts everything to match what the player hears.

export interface AudioClockSource {
    currentTime: number;
}

export function songTimeMs(audioNowSec: number, startAtSec: number, offsetMs: number): number {
    return (audioNowSec - startAtSec) * 1000 - offsetMs;
}

// `eventTimeStampMs` and `perfNowMs` are both on the performance.now() clock.
export function eventSongTimeMs(audioNowSec: number, perfNowMs: number, eventTimeStampMs: number, startAtSec: number, offsetMs: number): number {
    const agoSec = Math.max(0, perfNowMs - eventTimeStampMs) / 1000;
    return songTimeMs(audioNowSec - agoSec, startAtSec, offsetMs);
}

export class SongClock {
    readonly startAtSec: number;
    private readonly source: AudioClockSource;
    private readonly offsetMs: number;

    constructor(source: AudioClockSource, leadInSec: number, offsetMs: number) {
        this.source = source;
        this.startAtSec = source.currentTime + leadInSec;
        this.offsetMs = offsetMs;
    }

    nowMs(): number {
        return songTimeMs(this.source.currentTime, this.startAtSec, this.offsetMs);
    }

    eventMs(eventTimeStampMs: number): number {
        return eventSongTimeMs(this.source.currentTime, performance.now(), eventTimeStampMs, this.startAtSec, this.offsetMs);
    }
}

// Used when the browser has no Web Audio: time then comes from performance.now().
export function performanceClockSource(): AudioClockSource {
    return {
        get currentTime() {
            return performance.now() / 1000;
        }
    };
}
