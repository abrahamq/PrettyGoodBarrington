// Turns an RGBA pixel buffer into the bytes of a PNG file, using Node's built-in zlib (no extra packages).
// PNG layout: an 8-byte signature, then chunks (IHDR size and color type, IDAT compressed pixels, IEND).
import { crc32, deflateSync } from 'node:zlib';
import type { PixelBuffer } from '../src/art/pixelBuffer.ts';

const SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];
const BIT_DEPTH = 8;
const COLOR_TYPE_RGBA = 6;

export function encodePng(image: PixelBuffer): Uint8Array {
    const header = new Uint8Array(13);
    const view = new DataView(header.buffer);
    view.setUint32(0, image.width);
    view.setUint32(4, image.height);
    header[8] = BIT_DEPTH;
    header[9] = COLOR_TYPE_RGBA;

    return concat([
        new Uint8Array(SIGNATURE),
        chunk('IHDR', header),
        chunk('IDAT', deflateSync(rowsWithFilterBytes(image))),
        chunk('IEND', new Uint8Array(0))
    ]);
}

// Each row starts with a filter byte; 0 means "no filter", so the raw pixels follow as-is.
function rowsWithFilterBytes(image: PixelBuffer): Uint8Array {
    const rowLength = image.width * 4;
    const raw = new Uint8Array(image.height * (rowLength + 1));

    for (let row = 0; row < image.height; row++) {
        raw.set(image.data.subarray(row * rowLength, (row + 1) * rowLength), row * (rowLength + 1) + 1);
    }

    return raw;
}

function chunk(type: string, data: Uint8Array): Uint8Array {
    const typeBytes = new TextEncoder().encode(type);
    const typeAndData = concat([typeBytes, data]);
    const out = new Uint8Array(4 + typeAndData.length + 4);
    const view = new DataView(out.buffer);

    view.setUint32(0, data.length);
    out.set(typeAndData, 4);
    view.setUint32(4 + typeAndData.length, crc32(typeAndData) >>> 0);

    return out;
}

function concat(parts: Uint8Array[]): Uint8Array {
    const out = new Uint8Array(parts.reduce((total, part) => total + part.length, 0));
    let offset = 0;

    for (const part of parts) {
        out.set(part, offset);
        offset += part.length;
    }

    return out;
}
