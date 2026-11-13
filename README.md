# Binagora Week 2026

**The Hive Reunion.** Fly Binagora’s bee along the Mar del Plata coast, pick up alfajores, churros and rabas, and meet the hive at the Hermitage Hotel.

Play it at [binweek2026.vercel.app](https://binweek2026.vercel.app/).

## Controls

Hold Space, W, ↑, or the screen to rise. Release to fall. Slide with A/D, the arrow keys, or a sideways drag. The on-screen buttons do the same thing.

P pauses. F toggles fullscreen. S toggles sound while a menu is open. You have three lives, and the orange checkpoints keep the current flight until you leave the page.

## Run it locally

This repo uses pnpm.

```sh
pnpm install
pnpm dev
```

`pnpm build` writes a static site to `dist/`. Host that folder anywhere. There is no backend.

## Where things live

| Path | What it is |
| --- | --- |
| `src/game/` | Flight rules, the coastal route, artwork and the canvas |
| `src/ui/` | Title menu and flight guide |
| `src/game/art/` | Illustrations and the script that packs them |

Built by [joacod](https://joacod.com) for Binagora Week 2026. The original flight systems were extracted from [Arcade Lab](https://github.com/joacod/arcade-lab).
