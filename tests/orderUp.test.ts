// Checks the Order Up! rules: cooking stages, the one-flip rule, serving to tickets, tips, and the round.
import { describe, expect, it } from 'vitest';
import {
    ORDER_UP, donenessOf, formatDollars, newOrderUp, slotAction, tapSlot, tipFor, updateOrderUp, type OrderUpState, type Patty, type Ticket
} from '../src/logic/orderUp.ts';

const patty = (sideA: number, sideB = 0, flipped = sideB > 0): Patty => ({ sideA, sideB, flipped });
const ticket = (doneness: Ticket['doneness'], patienceMs = ORDER_UP.patienceMs, extras: Ticket['extras'] = []): Ticket =>
    ({ id: 1, doneness, extras, patienceMs });

function withGrill(grill: (Patty | null)[], tickets: Ticket[] = []): OrderUpState {
    return { ...newOrderUp(1), grill, tickets };
}

describe('donenessOf', () => {
    it('cooks from raw to rare, medium, and well by total cooking time, and burns when a side goes too long', () => {
        expect(donenessOf(patty(1000))).toBe('raw');
        expect(donenessOf(patty(3000))).toBe('rare');
        expect(donenessOf(patty(4000, 2000))).toBe('medium');
        expect(donenessOf(patty(5000, 4000))).toBe('well');
        expect(donenessOf(patty(5000, 6000))).toBe('burnt');
    });

    it('burns a patty whose one side cooked too long, however short the total', () => {
        expect(donenessOf(patty(ORDER_UP.sideBurnMs))).toBe('burnt');
        expect(donenessOf(patty(1000, ORDER_UP.sideBurnMs))).toBe('burnt');
    });
});

describe('cooking', () => {
    it('cooks the first side until the flip, then the second side', () => {
        const before = updateOrderUp(withGrill([patty(0), null, null, null]), 1000);
        const flipped = tapSlot(before, 0);
        const after = updateOrderUp(flipped, 500);

        expect(before.grill[0]).toEqual({ sideA: 1000, sideB: 0, flipped: false });
        expect(after.grill[0]).toEqual({ sideA: 1000, sideB: 500, flipped: true });
    });
});

describe('tapSlot', () => {
    it('puts a raw patty on an empty spot', () => {
        expect(tapSlot(withGrill([null, null, null, null]), 2).grill[2]).toEqual({ sideA: 0, sideB: 0, flipped: false });
    });

    it('flips an unflipped patty', () => {
        const state = tapSlot(withGrill([patty(2000), null, null, null]), 0);

        expect(state.grill[0]?.flipped).toBe(true);
        expect(state.events).toEqual([{ kind: 'flip', slot: 0 }]);
    });

    it('serves a flipped patty instead of flipping it again (only one flip)', () => {
        const state = tapSlot(withGrill([patty(3000, 1000), null, null, null], [ticket('rare')]), 0);

        expect(state.grill[0]).toBeNull();
        expect(state.tickets).toHaveLength(0);
    });

    it('tosses a burnt patty', () => {
        const state = tapSlot(withGrill([patty(ORDER_UP.sideBurnMs), null, null, null], [ticket('rare')]), 0);

        expect(state.grill[0]).toBeNull();
        expect(state.tickets).toHaveLength(1);
        expect(state.events).toEqual([{ kind: 'toss', slot: 0 }]);
    });

    it('keeps a flipped patty on the grill when no ticket is waiting', () => {
        const state = tapSlot(withGrill([patty(3000, 1000), null, null, null]), 0);

        expect(state.grill[0]).not.toBeNull();
        expect(slotAction(state, 0)).toBe('wait');
    });

    it('names the action a tap will do, for the button label', () => {
        const state = withGrill([null, patty(1000), patty(3000, 100), patty(ORDER_UP.sideBurnMs)], [ticket('rare')]);

        expect([0, 1, 2, 3].map((slot) => slotAction(state, slot))).toEqual(['add', 'flip', 'serve', 'toss']);
    });
});

describe('serving', () => {
    it('serves the oldest ticket first', () => {
        const oldest = { ...ticket('medium'), id: 7 };
        const newer = { ...ticket('rare'), id: 8 };
        const state = tapSlot(withGrill([patty(4000, 2500), null, null, null], [oldest, newer]), 0);

        expect(state.tickets.map((t) => t.id)).toEqual([8]);
        expect(state.events[0]).toMatchObject({ kind: 'tip', ticketId: 7 });
    });

    it('pays a tip for the right doneness and $0 for the wrong one', () => {
        const right = tapSlot(withGrill([patty(4000, 2500), null, null, null], [ticket('medium')]), 0);
        const wrong = tapSlot(withGrill([patty(4000, 2500), null, null, null], [ticket('well')]), 0);

        expect(right.tipsCents).toBeGreaterThan(0);
        expect(wrong.tipsCents).toBe(0);
        expect(wrong.events[0]).toMatchObject({ kind: 'wrong' });
    });
});

describe('tipFor', () => {
    it('pays the full tip, plus 50 cents per extra, on a fresh ticket', () => {
        expect(tipFor(ticket('rare'), 'rare')).toBe(ORDER_UP.baseTipCents);
        expect(tipFor(ticket('rare', ORDER_UP.patienceMs, ['cheese', 'fries']), 'rare')).toBe(ORDER_UP.baseTipCents + 100);
    });

    it('scales the tip by the patience left, rounded to a quarter', () => {
        expect(tipFor(ticket('well', ORDER_UP.patienceMs / 2), 'well')).toBe(150);
        expect(tipFor(ticket('well', ORDER_UP.patienceMs * 0.3), 'well')).toBe(100);
    });

    it('pays nothing for the wrong doneness', () => {
        expect(tipFor(ticket('rare'), 'medium')).toBe(0);
        expect(tipFor(ticket('rare'), 'burnt')).toBe(0);
    });
});

describe('formatDollars', () => {
    it('writes cents as dollars and cents', () => {
        expect(formatDollars(1275)).toBe('$12.75');
        expect(formatDollars(50)).toBe('$0.50');
        expect(formatDollars(0)).toBe('$0.00');
    });
});

describe('tickets and the round', () => {
    it('starts with one ticket and adds more over time, up to three', () => {
        let state = newOrderUp(3);
        expect(state.tickets).toHaveLength(1);

        state = updateOrderUp(state, ORDER_UP.ticketEveryMs);
        expect(state.tickets).toHaveLength(2);

        for (let i = 0; i < 5; i++) {
            state = updateOrderUp(state, ORDER_UP.ticketEveryMs / 2);
        }
        expect(state.tickets.length).toBeLessThanOrEqual(ORDER_UP.maxTickets);
    });

    it('drops a ticket whose patience runs out', () => {
        const state = updateOrderUp(withGrill([null, null, null, null], [ticket('rare', 100)]), 200);

        expect(state.tickets.find((t) => t.id === 1)).toBeUndefined();
        expect(state.events).toContainEqual({ kind: 'expired', ticketId: 1 });
    });

    it('makes the same tickets from the same seed', () => {
        const a = updateOrderUp(newOrderUp(42), ORDER_UP.ticketEveryMs * 2);
        const b = updateOrderUp(newOrderUp(42), ORDER_UP.ticketEveryMs * 2);

        expect(a.tickets).toEqual(b.tickets);
    });

    it('ends after 90 seconds, and wins with at least $10 in tips', () => {
        const ended = updateOrderUp({ ...newOrderUp(1), elapsedMs: ORDER_UP.roundMs - 1, tipsCents: 1000 }, 5);
        const short = updateOrderUp({ ...newOrderUp(1), elapsedMs: ORDER_UP.roundMs - 1, tipsCents: 975 }, 5);

        expect(ended.status).toBe('won');
        expect(short.status).toBe('lost');
    });

    it('ignores taps and time once the round is over', () => {
        const over: OrderUpState = { ...newOrderUp(1), status: 'lost' };

        expect(tapSlot(over, 0)).toEqual(over);
        expect(updateOrderUp(over, 1000)).toEqual(over);
    });
});
