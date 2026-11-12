# Project guidance

This repository owns one standalone Canvas 2D game. It began as Cloudwake Deluxe and can evolve independently. Use the [game adaptation skill](.agents/skills/game-adaptation/SKILL.md) for game, visual and asset work, and the [AudioBits skill](.agents/skills/audiobits/SKILL.md) for sound. Read the relevant owners in [architecture](docs/architecture.md) before changing a system.

- Keep rules and physical geometry in `src/game/content.ts`, `route.ts`, `collection.ts` and `game.ts`. Simulation has no browser, renderer or audio dependencies.
- Keep images, palettes, anchors, animation and effects game-owned. Use complete authored sprites/cels. An artwork change must not silently change collision geometry, timing or progression.
- The session owns browser resources and connects semantic events to rendering/audio. Preserve input clearing, readiness, gesture-based audio activation, pause, display changes, cancellation, HMR and disposal.
- Keep `src/engine/` game-independent and `src/ui/` focused on DOM presentation. Add abstractions only for concrete needs. No theme registry, collection shell, library packaging or compatibility layer without a requirement.
- Required assets must be committed and redistributable. Preserve source artwork, provenance, packing instructions and required license notices.
- Run `pnpm check`. Use `pnpm check:browser` after browser-sensitive changes. Prefer bounded deterministic invariants over additional browser scenarios; every new test needs a specific regression. Keep docs about design and maintenance, not manual sign-off checklists.
- Use `<type>/<short-description>` for branches. Do not add a `codex/` prefix unless requested.
