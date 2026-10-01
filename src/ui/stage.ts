// Fits 240-wide screens into a wider view (see layout.ts). setStage centers the screen and adds its
// backdrop, which reaches past the stage edges. pinToEdges moves HUD pieces out to the view's edges.
// Both follow the view when its width changes, for example when a phone rotates.
import type { GameObjects, Scene } from 'phaser';
import { CENTER_X, GAME_WIDTH } from '../layout.ts';

type Movable = GameObjects.GameObject & { x: number };

// Room on each side of the stage, in game pixels: 0 on a 3:2 screen.
function sideRoom(scene: Scene): number {
    return (scene.scale.width - GAME_WIDTH) / 2;
}

export function setStage(scene: Scene, backdropKey?: string): void {
    const camera = scene.cameras.main;
    followViewWidth(scene, () => camera.setScroll(-sideRoom(scene), 0));

    if (backdropKey) {
        scene.add.image(CENTER_X, 0, backdropKey).setOrigin(0.5, 0);
    }
}

// Pieces made by `build` that start on the left half of the stage stay at the view's left edge,
// and the rest stay at the right edge. Call it in a scene that also calls setStage.
export function pinToEdges(scene: Scene, build: () => void): void {
    const first = scene.children.length;
    build();

    const pieces = scene.children.list.slice(first) as Movable[];
    const leftSide = new Set(pieces.filter((piece) => piece.x < CENTER_X));
    let shift = 0;

    followViewWidth(scene, () => {
        const next = sideRoom(scene);
        for (const piece of pieces) {
            piece.x += leftSide.has(piece) ? shift - next : next - shift;
        }
        shift = next;
    });
}

function followViewWidth(scene: Scene, apply: () => void): void {
    apply();
    scene.scale.on('resize', apply);
    scene.events.once('shutdown', () => scene.scale.off('resize', apply));
}
