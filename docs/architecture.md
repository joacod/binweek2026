# Architecture

The entrypoint mounts Binagora Week 2026 directly. The Hive Reunion event artwork is the only presentation. There is no catalog, theme switcher, alternate art bundle or dependency on the source repository.

| Owner | Responsibility |
| --- | --- |
| `src/main.ts`, `src/style.css` | Document mount, persistent fullscreen target, startup failure and HMR cleanup |
| `src/site.ts`, `scripts/site-assets.mjs` | Public title, description and canonical URL. Dev and production builds generate the share card, icons, robots.txt and sitemap, then inject them into the initial HTML |
| `src/game/app.ts` | Session composition, screen transitions, clock, required-art readiness, graphics recovery, fresh runs and checkpoint continuation |
| `src/game/content.ts`, `route.ts`, `collection.ts`, `game.ts` | Tuning/geometry, seeded route certification, swept pickups, mutable rules, finite completion, player-progress chapters and semantic events |
| `src/game/input.ts` | Action mapping, launch hold, pointer capture and relative CSS-pixel drag |
| `src/game/presentation.ts` | Canvas drawing, uniform projection, sprite anchors/cels, cosmetic history and bounded effects |
| `src/game/art.ts`, `art/` | Required image URLs, decoded dimensions, runtime images and editable originals |
| `src/game/ui.ts`, `style.css` | Flight HUD, result formatting, controls and visual identity |
| `src/game/sound.ts`, `sound-recipes.ts` | Event-to-cue policy, priorities, throttles and AudioBits recipes |
| `src/ui/` | Menu DOM, accessibility/focus, utilities, readiness notices and readouts |
| `src/engine/` | Fixed-step timing, collision primitives, bindings, cooldowns and aggregate cleanup |
| `src/engine/browser/` | Host frame/measurement ownership, fullscreen, buttons, page/focus lifetime, images, readiness and audio |

The session mounts synchronously and releases partially constructed resources on failure. Required art loads asynchronously and must decode, validate and draw before Play is enabled. Retry uses the same readiness gate. A draw failure pauses the retained run and asks for an explicit retry, creating a fresh renderer with the same artwork. It never falls back to another presentation. Disposal aborts image preparation and ignores stale readiness completions.

Simulation advances through a bounded fixed-step clock only while playing and ready. Restart creates a new run. Continue restores the simulation's checkpoint snapshot. Renderer reset clears cosmetic history. Page blur/hide and display transitions suspend play, clear held input and reset the clock. The host owns one frame loop, observation and abort signal, while the renderer owns its Canvas buffer. Cosmetic transforms never advance rules.

AudioBits **0.7.0** is the only runtime package. `engine/browser/audio.ts` lazily owns one engine, caps voice overlap, invalidates pending activation and disposes voices/context. Start/resume/continue gestures activate it synchronously; touch launches use the completed tap so activation is accepted on mobile. Flight gestures can retry interrupted audio. The wing cue retains one sustained voice with smoothed thrust controls, and pause/crash/arrival/reset release it alongside the other owned graphs. The game maps events to recipes and local cooldowns. See the [AudioBits skill](../.agents/skills/audiobits/SKILL.md) before changing sound. Optional MCP tooling in that skill is authoring support and is not needed to run or build the game.

Vite builds static assets with relative URLs. Its config recreates `public/social.png`, the icon sizes, `robots.txt` and `sitemap.xml` on every dev server and production build, then injects Open Graph, Twitter Card and WebSite data into the document before any script runs. Those derived files stay out of git. The canonical URL is `https://binweek2026.vercel.app/`. TypeScript checks source ownership through explicit imports. Sharp is an offline artwork tool, and Playwright is used only for Chromium verification. Versions and the lockfile preserve the extraction's dependency baseline. The narrow pnpm release-age exception retains the already-used AudioBits version.

## Origin

Extracted from [Arcade Lab](https://github.com/joacod/arcade-lab), game source `src/games/cloudwake`, at commit `e75fbd2fe4786528afd188dd4bcabb7ead24ad61`. Built by [joacod](https://joacod.com).

Code and original AI-generated artwork retain the [MIT license](../LICENSE). MIT requires that copyright notice and permission text to stay with copies. It does not require the links above. There are no third-party art packs. This repository owns its implementation and future changes. Keep, update, or remove the origin links as the game diverges.
