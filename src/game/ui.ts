import { createElementLookup, setText, setProperty } from '../ui/dom.ts';
import externalLink from '../ui/external-link.svg?raw';
import github from '../ui/github.svg?raw';
import { createMenuReadout } from '../ui/menu-components.ts';
import { createGameMenu, menuActions, type CommonMenuIntent } from '../ui/menu.ts';
import { site } from '../site.ts';
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
    controls: `<div class="binweek-guide"><section><h3>Find your wings</h3><p>Hold <kbd>Space</kbd>, W, ↑, or the playfield to rise. Release to fall. Slide with A / D, ← / →, or sideways drag. Touch controls work too.</p></section><section><h3>Follow the snacks</h3><p>Alfajores, churros, rabas and beer start at +25. Every five consecutive pickups raise your multiplier, up to ×4. A miss resets the streak. ${flight.shieldFragments} collectibles charge a five-second, one-hit Hive Shield.</p></section><section><h3>Meet the hive</h3><p>Avoid stone structures and snack-stealing gulls. You have three lives. Orange # beacons save your progress. Continue restores that checkpoint without refilling lives. Reach the Hermitage to reunite.</p></section></div>`,
    actions: [menuActions.start, menuActions.resume, { id: 'continue', label: 'Continue', screens: ['crashed'], primary: true }, { ...menuActions.restart, screens: ['paused', 'crashed', 'defeat', 'victory'] }],
  });
  const header = menu.layer.querySelector('.game-menu-header')!;
  const mark = document.createElement('img'); mark.src = logo; mark.alt = 'Binagora'; mark.className = 'binweek-logo'; mark.width = 474; mark.height = 132;
  const brand = document.createElement('a'); brand.href = 'https://binagora.com/'; brand.target = '_blank'; brand.rel = 'noopener noreferrer'; brand.className = 'binweek-brand-link'; brand.title = 'Visit Binagora (opens in a new tab)'; brand.append(mark);
  header.prepend(brand);
  menu.layer.querySelector('.game-menu-eyebrow')!.textContent = 'MAR DEL PLATA, ARGENTINA';
  const subtitle = document.createElement('p'); subtitle.className = 'binweek-subtitle'; subtitle.textContent = 'The Hive Reunion'; header.append(subtitle);
  const premise = document.createElement('div'); premise.className = 'binweek-premise'; premise.innerHTML = '<span>5 coastal stops <i aria-hidden="true">·</i> a 2-minute escape</span><p><kbd>Hold</kbd> to rise. Release to fall.<br><small>A / D, arrows or drag to slide.</small></p>';
  results.element.before(premise);
  const origin = menu.layer.querySelector('.game-menu-origin')!;
  const credit = document.createElement('span');
  credit.append(...origin.childNodes);
  const source = document.createElement('a');
  source.className = 'binweek-source';
  source.href = site.repository;
  source.target = '_blank';
  source.rel = 'noopener noreferrer';
  source.title = 'View the source on GitHub (opens in a new tab)';
  source.innerHTML = `${github}<span>GitHub</span>${externalLink}`;
  origin.replaceChildren(credit, source);
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
      results.element.hidden = screen === 'title'; premise.hidden = screen !== 'title'; brand.hidden = screen !== 'title'; subtitle.hidden = screen !== 'title';
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
      setText($('.cloudwake-leg'), `${chapterAt(run.checkpoint.number) + 1} / ${journeyLegs} · ${chapterNames[chapterAt(run.checkpoint.number)]}`);
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
