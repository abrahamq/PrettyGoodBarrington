// Order Up! rules (GB Eats). No Phaser here: each function takes a state and returns a new one.
//
// The grill has 4 spots. Tap an empty spot to add a raw patty. The side facing down cooks; the first tap on a
// patty flips it (only once), and the next tap serves it to the oldest ticket. A patty's doneness comes from
// its total cooking time (rare at 3 s, medium at 6 s, well at 9 s), but one side alone burns after 6 s,
// so medium and well patties need their flip at the right moment. Burnt patties can only be tossed.
// The right doneness earns a tip scaled by the patience left on the ticket; the wrong one earns nothing.
// The round lasts 90 seconds; $10 in tips wins. Money is counted in cents to avoid rounding errors.

export type Doneness = 'raw' | 'rare' | 'medium' | 'well' | 'burnt';
export type OrderDoneness = 'rare' | 'medium' | 'well';
export type Extra = 'cheese' | 'fries';
export type SlotAction = 'add' | 'flip' | 'serve' | 'toss' | 'wait';

export const ORDER_UP = {
    roundMs: 90_000,
    goalCents: 1000,
    slots: 4,
    maxTickets: 3,
    rareMs: 3000,
    mediumMs: 6000,
    wellMs: 9000,
    sideBurnMs: 6000,
    flipWarningMs: 4500,
    patienceMs: 25_000,
    ticketEveryMs: 7000,
    baseTipCents: 300,
    extraTipCents: 50,
    tipStepCents: 25
};

export interface Patty {
    // Side A faces down first; side B faces down after the flip.
    sideA: number;
    sideB: number;
    flipped: boolean;
}

export interface Ticket {
    id: number;
    doneness: OrderDoneness;
    extras: Extra[];
    patienceMs: number;
}

export type OrderEvent =
    | { kind: 'add'; slot: number }
    | { kind: 'flip'; slot: number }
    | { kind: 'toss'; slot: number }
    | { kind: 'noTicket'; slot: number }
    | { kind: 'tip'; slot: number; ticketId: number; cents: number }
    | { kind: 'wrong'; slot: number; ticketId: number }
    | { kind: 'expired'; ticketId: number }
    | { kind: 'newTicket'; ticketId: number };

export interface OrderUpState {
    status: 'playing' | 'won' | 'lost';
    elapsedMs: number;
    grill: (Patty | null)[];
    // Oldest first: the next patty served goes to tickets[0].
    tickets: Ticket[];
    nextTicketId: number;
    nextTicketInMs: number;
    tipsCents: number;
    // The random-number state, so the same seed always makes the same tickets.
    seed: number;
    // What happened during the last call, so the scene can show popups.
    events: OrderEvent[];
}

const ORDER_DONENESS: OrderDoneness[] = ['rare', 'medium', 'well'];

export function newOrderUp(seed: number): OrderUpState {
    const empty: OrderUpState = {
        status: 'playing',
        elapsedMs: 0,
        grill: new Array(ORDER_UP.slots).fill(null),
        tickets: [],
        nextTicketId: 1,
        nextTicketInMs: ORDER_UP.ticketEveryMs,
        tipsCents: 0,
        seed,
        events: []
    };

    return { ...addTicket(empty), events: [] };
}

export function donenessOf(patty: Patty): Doneness {
    if (patty.sideA >= ORDER_UP.sideBurnMs || patty.sideB >= ORDER_UP.sideBurnMs) {
        return 'burnt';
    }

    const total = patty.sideA + patty.sideB;
    if (total >= ORDER_UP.wellMs) {
        return 'well';
    }
    if (total >= ORDER_UP.mediumMs) {
        return 'medium';
    }
    return total >= ORDER_UP.rareMs ? 'rare' : 'raw';
}

// True when an unflipped patty's bottom side is close to burning.
export function needsFlip(patty: Patty): boolean {
    return !patty.flipped && patty.sideA >= ORDER_UP.flipWarningMs && patty.sideA < ORDER_UP.sideBurnMs;
}

export function slotAction(state: OrderUpState, slot: number): SlotAction {
    const patty = state.grill[slot];

    if (!patty) {
        return 'add';
    }
    if (donenessOf(patty) === 'burnt') {
        return 'toss';
    }
    if (!patty.flipped) {
        return 'flip';
    }
    return state.tickets.length > 0 ? 'serve' : 'wait';
}

export function tapSlot(state: OrderUpState, slot: number): OrderUpState {
    if (state.status !== 'playing') {
        return state;
    }

    const patty = state.grill[slot];
    const next = { ...state, events: [] as OrderEvent[] };

    switch (slotAction(state, slot)) {
        case 'add':
            return { ...next, grill: replaceSlot(state.grill, slot, { sideA: 0, sideB: 0, flipped: false }), events: [{ kind: 'add', slot }] };
        case 'toss':
            return { ...next, grill: replaceSlot(state.grill, slot, null), events: [{ kind: 'toss', slot }] };
        case 'flip':
            return { ...next, grill: replaceSlot(state.grill, slot, { ...(patty as Patty), flipped: true }), events: [{ kind: 'flip', slot }] };
        case 'wait':
            return { ...next, events: [{ kind: 'noTicket', slot }] };
        case 'serve':
            return serve(next, slot, patty as Patty);
    }
}

// The tip for serving a patty of `doneness` to `ticket`: nothing if it is wrong, otherwise
// $3 plus 50 cents per extra, times the share of patience left, rounded to the nearest quarter.
export function tipFor(ticket: Ticket, doneness: Doneness): number {
    if (doneness !== ticket.doneness) {
        return 0;
    }

    const full = ORDER_UP.baseTipCents + ORDER_UP.extraTipCents * ticket.extras.length;
    const patienceLeft = Math.max(0, ticket.patienceMs) / ORDER_UP.patienceMs;
    return Math.round((full * patienceLeft) / ORDER_UP.tipStepCents) * ORDER_UP.tipStepCents;
}

export function updateOrderUp(state: OrderUpState, deltaMs: number): OrderUpState {
    if (state.status !== 'playing') {
        return state;
    }

    const events: OrderEvent[] = [];
    const grill = state.grill.map((patty) => patty && cook(patty, deltaMs));
    const tickets: Ticket[] = [];

    for (const ticket of state.tickets) {
        const patienceMs = ticket.patienceMs - deltaMs;
        if (patienceMs > 0) {
            tickets.push({ ...ticket, patienceMs });
        } else {
            events.push({ kind: 'expired', ticketId: ticket.id });
        }
    }

    let next: OrderUpState = {
        ...state,
        elapsedMs: state.elapsedMs + deltaMs,
        grill,
        tickets,
        nextTicketInMs: state.nextTicketInMs - deltaMs,
        events
    };

    if (next.nextTicketInMs <= 0) {
        next = next.tickets.length < ORDER_UP.maxTickets
            ? { ...addTicket(next), nextTicketInMs: next.nextTicketInMs + ORDER_UP.ticketEveryMs }
            : { ...next, nextTicketInMs: 0 };
    }

    if (next.elapsedMs >= ORDER_UP.roundMs) {
        next = { ...next, status: next.tipsCents >= ORDER_UP.goalCents ? 'won' : 'lost' };
    }

    return next;
}

export function roundLeftMs(state: OrderUpState): number {
    return Math.max(0, ORDER_UP.roundMs - state.elapsedMs);
}

export function formatDollars(cents: number): string {
    const dollars = Math.floor(cents / 100);
    return `$${dollars}.${String(cents % 100).padStart(2, '0')}`;
}

function serve(state: OrderUpState, slot: number, patty: Patty): OrderUpState {
    const [ticket, ...rest] = state.tickets;
    const cents = tipFor(ticket, donenessOf(patty));
    const event: OrderEvent = cents > 0
        ? { kind: 'tip', slot, ticketId: ticket.id, cents }
        : { kind: 'wrong', slot, ticketId: ticket.id };

    return {
        ...state,
        grill: replaceSlot(state.grill, slot, null),
        tickets: rest,
        tipsCents: state.tipsCents + cents,
        events: [event]
    };
}

function cook(patty: Patty, deltaMs: number): Patty {
    return patty.flipped ? { ...patty, sideB: patty.sideB + deltaMs } : { ...patty, sideA: patty.sideA + deltaMs };
}

function replaceSlot(grill: (Patty | null)[], slot: number, patty: Patty | null): (Patty | null)[] {
    return grill.map((current, i) => (i === slot ? patty : current));
}

function addTicket(state: OrderUpState): OrderUpState {
    const [roll1, seed1] = random(state.seed);
    const [roll2, seed2] = random(seed1);
    const [roll3, seed3] = random(seed2);
    const extras: Extra[] = [];

    if (roll2 < 0.5) {
        extras.push('cheese');
    }
    if (roll3 < 0.4) {
        extras.push('fries');
    }

    const ticket: Ticket = {
        id: state.nextTicketId,
        doneness: ORDER_DONENESS[Math.floor(roll1 * ORDER_DONENESS.length)],
        extras,
        patienceMs: ORDER_UP.patienceMs
    };

    return {
        ...state,
        tickets: [...state.tickets, ticket],
        nextTicketId: state.nextTicketId + 1,
        seed: seed3,
        events: [...state.events, { kind: 'newTicket', ticketId: ticket.id }]
    };
}

// "Mulberry32", a small, fast random-number generator. Returns a number in [0, 1) and the next seed.
function random(seed: number): [number, number] {
    const next = (seed + 0x6d2b79f5) | 0;
    let r = Math.imul(next ^ (next >>> 15), 1 | next);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return [((r ^ (r >>> 14)) >>> 0) / 4294967296, next];
}
