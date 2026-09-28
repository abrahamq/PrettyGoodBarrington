// Turns SVG path strings from the mockups into rows of whole pixels ("spans"), so placeholder art
// can copy the mockup paths as-is and still come out crisp, even along diagonal edges.
// Supports only the commands the mockups use: M, L, H, V (and their lowercase relative forms) and Z.

export interface Point {
    x: number;
    y: number;
}

export interface Span {
    y: number;
    x: number;
    width: number;
}

export function rectPath(x: number, y: number, width: number, height: number): string {
    return `M${x} ${y}h${width}v${height}h${-width}z`;
}

export function parsePath(d: string): Point[][] {
    const tokens = d.match(/[a-zA-Z]|-?\d*\.?\d+/g) ?? [];
    const shapes: Point[][] = [];
    let shape: Point[] = [];
    let x = 0;
    let y = 0;
    let command = '';
    let i = 0;

    const nextNumber = () => Number(tokens[i++]);

    while (i < tokens.length) {
        if (/[a-zA-Z]/.test(tokens[i])) {
            command = tokens[i++];
        } else if (command === 'M') {
            command = 'L';
        } else if (command === 'm') {
            command = 'l';
        }

        switch (command) {
            case 'M':
            case 'm':
                if (shape.length > 0) {
                    shapes.push(shape);
                }
                x = command === 'M' ? nextNumber() : x + nextNumber();
                y = command === 'M' ? nextNumber() : y + nextNumber();
                shape = [{ x, y }];
                break;
            case 'L':
                x = nextNumber();
                y = nextNumber();
                shape.push({ x, y });
                break;
            case 'l':
                x += nextNumber();
                y += nextNumber();
                shape.push({ x, y });
                break;
            case 'H':
                x = nextNumber();
                shape.push({ x, y });
                break;
            case 'h':
                x += nextNumber();
                shape.push({ x, y });
                break;
            case 'V':
                y = nextNumber();
                shape.push({ x, y });
                break;
            case 'v':
                y += nextNumber();
                shape.push({ x, y });
                break;
            case 'Z':
            case 'z':
                shapes.push(shape);
                x = shape[0].x;
                y = shape[0].y;
                shape = [];
                break;
            default:
                throw new Error(`Unsupported SVG path command: ${command}`);
        }
    }

    if (shape.length > 0) {
        shapes.push(shape);
    }

    return shapes;
}

// A pixel is filled when its center is inside the shape. This is how SVG draws with
// shape-rendering="crispEdges", so the result matches the mockups.
export function fillSpans(polygon: Point[]): Span[] {
    const ys = polygon.map((point) => point.y);
    const top = Math.floor(Math.min(...ys));
    const bottom = Math.ceil(Math.max(...ys));
    const spans: Span[] = [];

    for (let row = top; row < bottom; row++) {
        const crossings = edgeCrossings(polygon, row + 0.5).sort((a, b) => a - b);

        for (let k = 0; k + 1 < crossings.length; k += 2) {
            const first = firstPixelCenteredAfter(crossings[k]);
            const end = firstPixelCenteredAfter(crossings[k + 1]);

            if (end > first) {
                spans.push({ y: row, x: first, width: end - first });
            }
        }
    }

    return spans;
}

export function pathToSpans(d: string): Span[] {
    return parsePath(d).flatMap(fillSpans);
}

function firstPixelCenteredAfter(edgeX: number): number {
    // "+ 0" turns -0 (from Math.ceil(-0.5)) into a plain 0.
    return Math.ceil(edgeX - 0.5) + 0;
}

function edgeCrossings(polygon: Point[], centerY: number): number[] {
    const xs: number[] = [];

    for (let i = 0; i < polygon.length; i++) {
        const a = polygon[i];
        const b = polygon[(i + 1) % polygon.length];
        const crosses = (a.y <= centerY && b.y > centerY) || (b.y <= centerY && a.y > centerY);

        if (crosses) {
            xs.push(a.x + ((centerY - a.y) / (b.y - a.y)) * (b.x - a.x));
        }
    }

    return xs;
}
