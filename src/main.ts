import { mountCloudwake } from './game/app.ts';
import { createFullscreen } from './engine/browser/fullscreen.ts';
import './style.css';

const root = document.querySelector<HTMLElement>('#app')!;
const fullscreen = createFullscreen(root);
try {
  const session = mountCloudwake(root, fullscreen);
  if (import.meta.hot) import.meta.hot.dispose(() => session.dispose());
} catch (error) {
  console.error('Could not start Cloudwake', error);
  const message = document.createElement('p');
  message.textContent = 'Cloudwake could not start. Reload the page to try again.';
  const retry = document.createElement('button');
  retry.textContent = 'Reload game';
  retry.addEventListener('click', () => location.reload());
  root.replaceChildren(message, retry);
}
