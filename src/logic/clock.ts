// The in-game clock. `dayMinutes` counts game minutes since midnight on the first day (a Saturday),
// so 840 is 2:00 PM on day one. One game minute passes every two real seconds.
// Also works out the time-of-day tint: clear by day, orange at golden hour, dark blue at night.
import { colorNumber } from '../palette.ts';

export const MINUTES_PER_DAY = 24 * 60;
export const REAL_MS_PER_GAME_MINUTE = 2000;

const WEEKDAYS = ['SAT', 'SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI'];
const FADE_MINUTES = 30;

export interface ClockState {
    dayMinutes: number;
    carryMs: number;
}

export interface Tint {
    color: number;
    alpha: number;
}

const DAY: Tint = { color: 0, alpha: 0 };
const GOLDEN: Tint = { color: colorNumber('goldenTint'), alpha: 0.22 };
const NIGHT: Tint = { color: colorNumber('nightTint'), alpha: 0.5 };

// Each change starts at `start` (minutes after midnight) and takes FADE_MINUTES.
const CHANGES: { start: number; from: Tint; to: Tint }[] = [
    { start: 6 * 60, from: NIGHT, to: DAY },
    { start: 17 * 60, from: DAY, to: GOLDEN },
    { start: 19 * 60 + 30, from: GOLDEN, to: NIGHT }
];

export function advanceClock(clock: ClockState, deltaMs: number): ClockState {
    const totalMs = clock.carryMs + deltaMs;
    const minutes = Math.floor(totalMs / REAL_MS_PER_GAME_MINUTE);

    return {
        dayMinutes: clock.dayMinutes + minutes,
        carryMs: totalMs - minutes * REAL_MS_PER_GAME_MINUTE
    };
}

// Always 11 characters, for example 'SAT  2:40PM'.
export function clockText(dayMinutes: number): string {
    const day = Math.floor(dayMinutes / MINUTES_PER_DAY);
    const minuteOfDay = dayMinutes - day * MINUTES_PER_DAY;
    const hours24 = Math.floor(minuteOfDay / 60);
    const minutes = minuteOfDay % 60;
    const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
    const suffix = hours24 < 12 ? 'AM' : 'PM';
    const time = `${hours12}:${String(minutes).padStart(2, '0')}${suffix}`;

    return `${WEEKDAYS[day % 7]} ${time.padStart(7, ' ')}`;
}

export function tintAt(dayMinutes: number): Tint {
    const minuteOfDay = ((dayMinutes % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
    let current = NIGHT;

    for (const change of CHANGES) {
        const progress = (minuteOfDay - change.start) / FADE_MINUTES;

        if (progress < 0) {
            break;
        }
        current = progress >= 1 ? change.to : blend(change.from, change.to, progress);
    }

    return current;
}

// A clear tint (alpha 0) has no real color, so fading to or from it keeps the other tint's color.
function blend(from: Tint, to: Tint, progress: number): Tint {
    const alpha = roundTo(from.alpha + (to.alpha - from.alpha) * progress, 4);

    if (from.alpha === 0) {
        return { color: to.color, alpha };
    }
    if (to.alpha === 0) {
        return { color: from.color, alpha };
    }

    return { color: blendColor(from.color, to.color, progress), alpha };
}

function blendColor(from: number, to: number, progress: number): number {
    const channel = (shift: number) => {
        const a = (from >> shift) & 0xff;
        const b = (to >> shift) & 0xff;
        return Math.round(a + (b - a) * progress) << shift;
    };

    return channel(16) | channel(8) | channel(0);
}

function roundTo(value: number, places: number): number {
    const factor = 10 ** places;
    return Math.round(value * factor) / factor;
}
