// Dialogue text layout: word-wraps text to the dialogue box width, splits it into pages,
// and works out how much of a page the typewriter effect has revealed so far.

export const TYPEWRITER_CHARS_PER_SECOND = 40;

export function wrapText(text: string, maxChars: number): string[] {
    const words = text.split(/\s+/).filter((word) => word.length > 0);
    const lines: string[] = [];
    let line = '';

    for (const word of words) {
        const candidate = line === '' ? word : `${line} ${word}`;

        if (candidate.length <= maxChars) {
            line = candidate;
            continue;
        }

        if (line !== '') {
            lines.push(line);
        }
        line = word;

        while (line.length > maxChars) {
            lines.push(line.slice(0, maxChars));
            line = line.slice(maxChars);
        }
    }

    if (line !== '') {
        lines.push(line);
    }

    return lines;
}

// Each paragraph starts on a new page.
export function pagesFor(paragraphs: string[], maxChars: number, linesPerPage: number): string[][] {
    const pages: string[][] = [];

    for (const paragraph of paragraphs) {
        const lines = wrapText(paragraph, maxChars);

        for (let i = 0; i < lines.length; i += linesPerPage) {
            pages.push(lines.slice(i, i + linesPerPage));
        }
    }

    return pages;
}

export function visibleCharacters(elapsedMs: number, charsPerSecond = TYPEWRITER_CHARS_PER_SECOND): number {
    return Math.floor((elapsedMs / 1000) * charsPerSecond);
}

export function revealLines(lines: string[], count: number): string[] {
    let remaining = count;

    return lines.map((line) => {
        const shown = line.slice(0, Math.max(0, remaining));
        remaining -= line.length;
        return shown;
    });
}

export function pageLength(lines: string[]): number {
    return lines.reduce((total, line) => total + line.length, 0);
}
