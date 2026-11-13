import { createElementLookup, setText, setProperty } from '../ui/dom.ts';
import { createMenuReadout } from '../ui/menu-components.ts';
import { createGameMenu, menuActions, type CommonMenuIntent } from '../ui/menu.ts';
import { flight, multiplierAt } from './content.ts';
import { chapterAt, chapterNames, journeyLegs } from './route.ts';
import type { Run } from './game.ts';

export type Screen = 'title' | 'playing' | 'paused' | 'crashed' | 'defeat' | 'victory';
export type Intent = CommonMenuIntent | 'continue';
const logo = new URL('./art/binagora-logo.png', import.meta.url).href;
export function createUI(root: HTMLElement, surface: HTMLElement, signal: AbortSignal, act: (intent: Intent) => void, mute: (value: boolean) => void) {
  root.innerHTML = `<header class="cloudwake-hud"><div class="cloudwake-brand">BINAGORA WEEK <em>2026</em><span>THE HIVE REUNION · MAR DEL PLATA</span></div>
    <div><small>LIVES</small><output aria-label="Lives">3</output></div><div class="cloudwake-score"><small>SCORE</small><output aria-label="Score">0</output></div><button data-intent="pause">Pause</button></header>
    <main class="cloudwake-stage"><div class="cloudwake-flight-status"><span class="cloudwake-leg"></span><div class="cloudwake-shield"><span class="cloudwake-shield-label"></span><progress aria-label="Hive Shield" max="1" value="0"></progress></div></div></main><footer class="cloudwake-footer"><div class="cloudwake-readout"><output aria-label="Distance">0 m</output><span class="cloudwake-fragments">0 collectibles</span></div><p class="cloudwake-hint">HOLD TO RISE <span>·</span> A D OR DRAG TO SLIDE</p><div class="cloudwake-touch"><button data-control="left" aria-label="Slide left">←</button><button data-control="right" aria-label="Slide right">→</button><button data-control="thrust" aria-label="Hold to rise">↑ <span>HOLD TO RISE</span></button></div></footer>`;
  const $ = createElementLookup(root), stage = $('.cloudwake-stage');
  stage.prepend(surface);
  const pause = $<HTMLButtonElement>('[data-intent="pause"]');
  pause.addEventListener('click', () => act('pause'), { signal });
  const controls = { thrust: $<HTMLButtonElement>('[data-control="thrust"]'), left: $<HTMLButtonElement>('[data-control="left"]'), right: $<HTMLButtonElement>('[data-control="right"]') };
  const results = createMenuReadout('Flight results');
  const assetStatus = document.createElement('p'); assetStatus.setAttribute('role', 'status'); assetStatus.hidden = true;
  const menu = createGameMenu<Intent, Screen>(root, surface, stage, {
    id: 'binweek', title: 'Binagora Week 2026', signal, pause,
    gameplayUI: root.querySelectorAll<HTMLElement>(':scope > header, :scope > footer, .cloudwake-flight-status'),
    onAction: act, onMute: mute, onFullscreen: () => act('fullscreen'), game: results.element,
    controls: `<b>A little flight. A big reunion.</b><p>Hold Space, W, ↑, the playfield, or Rise to fly up. Release to fall. Slide with A / D, ← / →, the on-screen arrows, or a sideways drag. Your first press on Play or Continue also applies thrust.</p><p>Follow the alfajores, churros and rubber ducks. Every collectible starts at +25. Five in a row raise the multiplier, up to ×4. Missing one resets the streak. Collect ${flight.shieldFragments} to charge a Hive Shield: five seconds of protection, or one hit.</p><p>Avoid solid seaside structures and snack-hunting gulls. The upper and lower sea breezes cushion you. You have three lives. Event beacons save your route, score, streak and shield. Continue returns to that checkpoint, without refilling lives. Reach the last beacon to join the whole hive at the Hermitage.</p>`,
    actions: [menuActions.start, menuActions.resume, { id: 'continue', label: 'Continue', screens: ['crashed'], primary: true }, { ...menuActions.restart, screens: ['paused', 'crashed', 'defeat', 'victory'] }],
  });
  const header = menu.layer.querySelector('.game-menu-header')!;
  const mark = document.createElement('img'); mark.src = logo; mark.alt = 'Binagora'; mark.className = 'binweek-logo'; mark.width = 474; mark.height = 132;
  header.prepend(mark);
  menu.layer.querySelector('.game-menu-eyebrow')!.textContent = 'MAR DEL PLATA, ARGENTINA';
  const subtitle = document.createElement('p'); subtitle.className = 'binweek-subtitle'; subtitle.textContent = 'The Hive Reunion'; header.append(subtitle);
  const premise = document.createElement('div'); premise.className = 'binweek-premise'; premise.innerHTML = '<span>01 EL PUERTO</span><span>02 PLAYA GRANDE</span><span>03 THE HERMITAGE</span><p>Hold to rise. Release to fall.<br>Slide with A / D, arrows, or sideways drag.</p><code>npm run binweek</code>';
  results.element.before(premise);
  menu.layer.querySelector('.game-menu-notices')!.prepend(assetStatus);
  return {
    artworkStatus(message: string) { assetStatus.textContent = message; assetStatus.hidden = !message; },
    controls, launchButtons: menu.actions.filter(button => ['start', 'restart', 'continue'].includes(button.dataset.menuAction!)),
    readiness: menu.readiness, fullscreen: menu.fullscreen, soundStatus: menu.soundStatus, displayStatus: menu.displayStatus,
    show(screen: Screen, focus = true) {
      menu.description.textContent = screen === 'title' ? 'The hive is gathering at the Hermitage. See you there!'
        : screen === 'crashed' ? 'A small detour. Continue from your latest checkpoint with its score, streak and shield.'
        : screen === 'defeat' ? 'The hive will save you a seat. Try the coast again.'
        : screen === 'victory' ? 'The whole hive, together.' : '';
      results.element.hidden = screen === 'title'; premise.hidden = screen !== 'title'; mark.hidden = screen !== 'title'; subtitle.hidden = screen !== 'title';
      for (const button of Object.values(controls)) button.disabled = screen !== 'playing';
      menu.show(screen, focus);
      if (screen === 'crashed') menu.heading.textContent = 'Unexpected snack exception.';
      if (screen === 'defeat') menu.heading.textContent = 'See you on the next flight';
      if (screen === 'victory') menu.heading.textContent = 'Welcome to Binagora Week 2026';
    },
    update(run: Run) {
      setText($('[aria-label="Score"]'), String(run.score).padStart(5, '0'));
      setText($('[aria-label="Lives"]'), String(run.lives));
      setText($('[aria-label="Distance"]'), `${Math.floor(run.distance / 10)} m`);
      const multiplier = multiplierAt(run.chain);
      setText($('.cloudwake-fragments'), `${run.pickups} collectibles · Streak ×${multiplier}`);
      setText($('.cloudwake-leg'), `${chapterAt(run.checkpoint.number) + 1} / 3 · ${chapterNames[chapterAt(run.checkpoint.number)]}`);
      const remain = run.shieldUntil - run.elapsed, live = remain > 0;
      setText($('.cloudwake-shield-label'), live ? `HIVE SHIELD ${remain.toFixed(1)}s` : `SHIELD ${run.shieldCharge}/${flight.shieldFragments}`);
      setProperty($<HTMLProgressElement>('.cloudwake-shield progress'), 'value', live ? remain / flight.shieldSeconds : run.shieldCharge / flight.shieldFragments);
      setProperty($('.cloudwake-shield').dataset, 'live', String(live));
      setProperty(controls.thrust.dataset, 'thrusting', String(run.thrust));
      results.update(run.status === 'victory' ? `Score ${run.score.toLocaleString()} · ${run.pickups} collectibles`
        : `Score ${run.score.toLocaleString()} · ${run.pickups} collectibles\n${run.lives} ${run.lives === 1 ? 'life' : 'lives'} left · Checkpoint ${Math.min(run.checkpoint.number, journeyLegs)}/${journeyLegs}\nStreak ×${multiplier}`);
    },
  };
}
