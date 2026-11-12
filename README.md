# Cloudwake

An endless sky-courier flight, extracted from Arcade Lab's Cloudwake Deluxe for **binweek2026**. Hold to rise, release to fall, and slide between sunlit ruins. Collect lost light, raise a shield, and continue from lantern checkpoints while lives remain.

## Run locally

Use Node 26 and pnpm 12.18.0.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Space, W, ↑, or a held mouse/touch press gives lift. A/D, ←/→, or sideways drag slides across the view. Touch buttons provide the same actions. P pauses/resumes, F toggles fullscreen, and S toggles sound in menus. Settings contains the full instructions. Checkpoints last only for the current flight.

## Build and verify

```sh
pnpm check
pnpm exec playwright install chromium
pnpm check:browser
pnpm preview
```

`check` runs TypeScript, deterministic tests and the production build. The browser check runs against that build and covers required-art retry, startup and pause/resume. `pnpm build` writes the standalone static site to `dist/`. Deploy that directory to a static web host, at the root or a subdirectory. Assets use relative built URLs. No backend, Arcade Lab checkout, or runtime CDN is required.

For future work, see [architecture](docs/architecture.md), [game design](docs/game.md), [artwork contracts](src/game/art/README.md), and the [game adaptation skill](.agents/skills/game-adaptation/SKILL.md). Run `pnpm art:pack` after editing the original artwork sources.
