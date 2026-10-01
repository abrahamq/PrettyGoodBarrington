// Just enough type information for the Node built-ins that scripts/ and tests use, so `tsc` can check them
// without adding @types/node (it is not on the allowed dependency list).

declare module 'node:fs' {
    export function existsSync(path: string): boolean;
    export function mkdirSync(path: string, options?: { recursive?: boolean }): string | undefined;
    export function writeFileSync(path: string, data: string | Uint8Array): void;
}

declare module 'node:zlib' {
    export function deflateSync(data: Uint8Array): Uint8Array;
    export function inflateSync(data: Uint8Array): Uint8Array;
    export function crc32(data: Uint8Array | string, value?: number): number;
}
