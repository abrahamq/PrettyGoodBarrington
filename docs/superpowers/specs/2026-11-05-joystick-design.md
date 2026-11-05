# Joystick design (2026-11-05)

Approved by Abe on 2026-11-05. From `todo.md`: replace the d-pad with an always-on, joystick-like control.

## Decisions

| Question | Choice |
|---|---|
| Kind of joystick | Fixed: a ring always shows at the bottom left. You press it and drag the knob. |
| Where the A button goes | It stays at the bottom right. The todo said "joystick bottom right"; Abe chose joystick left, A right. |
| Who sees it | Touch screens only (`game.device.input.touch`, which is true for phones, iPads, and touch laptops). Mouse-and-keyboard players do not see it. |
| The Options toggle | D-PAD leaves Options. The stored `dpad` setting is ignored. |

## Behavior

- **Size and place.** A 36 px ring at the bottom left, where the d-pad was. Its touch area is a 26 px radius around the ring's center, larger than the ring, because thumbs are not exact. The knob is 14 px and moves up to 11 px from the center.
- **Direction.** Nothing happens inside a 4 px dead zone. Past it, the axis with the bigger offset wins. To change from one axis to the other, the new axis must be 25% bigger than the current axis, so a thumb near a diagonal does not jitter the player.
- **Grip.** After a finger grabs the joystick, the joystick follows that finger anywhere on the screen until it lifts. When it lifts, the knob goes back to the center and the direction is cleared.
- **A button.** It stays where it is (22 px, bottom right). A second finger can press A while a thumb holds the joystick. The UI scene adds one extra pointer, as Curtain Call does.
- **Dialogue.** The joystick and A button hide while dialogue is open, as before. Hiding clears the direction and drops the grip.
- **Tap-to-walk.** It still works on the rest of the screen. A press on the joystick or A button does not walk the player.

## Code

- `src/logic/joystick.ts`: `stickDirection(dx, dy, current)` returns a `Direction` or `null`. Pure, no Phaser. Tests in `tests/joystick.test.ts`: the dead zone, all 4 directions, the diagonal rule in both directions, and a return to the dead zone.
- `src/ui/TouchControls.ts`: the ring and knob replace the 4 arrow buttons. The public API (`direction`, `takeAction()`, `setVisible()`) stays the same, so `Overworld.ts` does not change. Knob offsets come from `pointer.worldX`/`worldY` and the ring's current position, so the joystick keeps working when the wide-screen work (PR #1) scrolls the UI camera and pins the controls to the screen edge.
- Ring and knob textures: pixel-art circles made in `src/art/`, ink at 70%, like the old buttons.
- `src/scenes/UI.ts`: make the controls when the device has touch, not when `dpad` is set. Add one pointer.
- `src/scenes/Options.ts`, `src/state/settings.ts`: remove D-PAD and the `dpad` field.
- `DECISIONS.md`: a new "Joystick" section. It replaces Phase 2 decision 13 (the optional d-pad).

## Testing

- Unit tests for `stickDirection`.
- In Chrome: force `game.device.input.touch` on, restart the UI scene, drag the knob with the mouse, and check that the player walks in each of the 4 directions and stops on release. Check that a click elsewhere still walks the player to that tile.
- On a phone (Abe): hold the joystick and tap A with a second finger next to an NPC.
