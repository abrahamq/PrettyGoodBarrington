// Screen and grid sizes shared by every scene. Every screen is laid out for 240x160 (the "stage").
// On a wider screen, like a phone in landscape, the view grows sideways up to MAX_VIEW_WIDTH, so there
// are no black bars: menus and minigames stay centered, and the backgrounds reach past the stage edges.

export const GAME_WIDTH = 240;
export const GAME_HEIGHT = 160;
export const CENTER_X = GAME_WIDTH / 2;
export const TILE_SIZE = 16;
export const MAX_VIEW_WIDTH = 384;
// How far the backgrounds reach past each side of the stage.
export const STAGE_WING = (MAX_VIEW_WIDTH - GAME_WIDTH) / 2;

// The view width for a screen of this size. It is even, so the centered stage starts on a whole pixel.
export function viewWidthFor(screenWidth: number, screenHeight: number): number {
    if (screenWidth <= 0 || screenHeight <= 0) {
        return GAME_WIDTH;
    }

    const matching = Math.floor((GAME_HEIGHT * screenWidth) / screenHeight / 2) * 2;
    return Math.min(Math.max(matching, GAME_WIDTH), MAX_VIEW_WIDTH);
}
