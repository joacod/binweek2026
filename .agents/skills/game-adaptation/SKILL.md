---
name: game-adaptation
description: Improve this standalone game's mechanics, art direction, sprites, scenery, UI and effects, including replacing assets while preserving gameplay and resource ownership.
---

# Adapt the game

Read [project guidance](../../../AGENTS.md), [architecture](../../../docs/architecture.md) and the relevant part of [game design](../../../docs/game.md). This is one game with one committed presentation. Change its owning files directly; an aesthetic reskin does not need a theme registry, presentation selector or reusable asset framework.

## Gameplay

Trace tuning and geometry in `src/game/content.ts`, pattern generation in `route.ts`, collection in `collection.ts`, and rules/events in `game.ts`. Keep browser APIs out of these files. Rendering and sound consume state and semantic events. Route changes must preserve the actual physics-based clearance certification and narrow-screen warning time. Checkpoint changes must retain score, route and shield snapshot consistency without refilling lives or farming rewards.

## Artwork and visual identity

Read the [art contracts](../../../src/game/art/README.md), then `art.ts` and `presentation.ts`. Identify the semantic role, source image, sheet cell, draw footprint, anchor and active animation before replacing an image. The current prompts, source PNGs and `pack.mjs` are editable authoring inputs; only runtime WebPs enter the browser build.

Replace complete courier/vehicle and lantern cels with stable pivots across frames. Do not independently trim animation frames or construct finished actors from cut-up limbs. Preserve alpha edges and foreground readability. Coral currently signals danger and turquoise signals rewards/safety; a new palette must retain equally clear role separation. Keep the horizon quiet behind obstacles and preserve seamless mirrored sky tiling.

Update `art.ts` dimensions when the decoded contract intentionally changes. Update visual footprints, cells, clips and anchors in `presentation.ts`. Physical geometry stays in `content.ts` unless changing mechanics is part of the task. Keep one uniform world transform, CSS-pixel drag input, bounded effects, cosmetic reset and reduced-motion behavior. Preserve the steady thrust cel and one-shot checkpoint bloom unless intentionally redesigning those motions.

Use `pnpm art:pack` for the current source layout; update its explicit crop rectangles if source layouts change. Commit runtime images and useful source artwork together, with provenance and compatible license notices. Remove superseded assets after the replacement works. Adjust the game stylesheet and menu styles for a coherent identity without introducing selectable modes.

## Sound and lifecycle

Use the [AudioBits skill](../audiobits/SKILL.md), the installed public runtime, and existing `sound.ts` / `sound-recipes.ts`. Keep event policy local and the audio lifecycle in `engine/browser/audio.ts`. Preserve gesture activation, bounded playback, cancellation, pause and teardown.

Artwork remains required before Play or Resume. Keep retry and renderer recovery, disposal during loading, and HMR cleanup. A reskin does not change checkpoints, run state or input timing.

## Verify proportionally

Run `pnpm check`. For session, input, menu, readiness or renderer integration changes also run `pnpm check:browser` against the built game. Inspect changed art in gameplay and menus at a desktop and a narrow viewport, checking anchors, silhouette alignment, hazards, clipping and readable controls. Use on-demand screenshots, not permanent screenshot matrices. Add a test only for a concrete uncovered regression at the cheapest adequate layer.
