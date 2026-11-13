import { mountBinweek } from './game/app.ts';
import { createFullscreen } from './engine/browser/fullscreen.ts';
import './style.css';

const root = document.querySelector<HTMLElement>('#app')!;
// The static introduction is for link crawlers. The mounted game replaces it.
root.replaceChildren();
const fullscreen = createFullscreen(root);
try {
  const session = mountBinweek(root, fullscreen);
  if (import.meta.hot) import.meta.hot.dispose(() => session.dispose());
} catch (error) {
  console.error('Could not start Binagora Week 2026', error);
  const message = document.createElement('p');
  message.textContent = 'Binagora Week 2026 could not start. Reload the page to try again.';
  const retry = document.createElement('button');
  retry.textContent = 'Reload game';
  retry.addEventListener('click', () => location.reload());
  root.replaceChildren(message, retry);
}
