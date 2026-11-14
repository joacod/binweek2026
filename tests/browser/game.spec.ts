import { test, expect } from '@playwright/test';
import { site } from '../../src/site.ts';

declare global {
  interface Window {
    audioProbe: { contexts: AudioContext[]; resumes: string[]; oscillators: number; level(): number; harmonics(): number[] };
  }
}

for (const touch of [false, true]) test.describe(touch ? 'touch audio' : 'desktop audio', () => {
  test.use({ hasTouch: touch, viewport: touch ? { width: 390, height: 844 } : { width: 1280, height: 900 } });
  test('launch unlocks quiet wings only while rising, and pause/resume retains one context', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    const touchSession = touch ? await page.context().newCDPSession(page) : undefined;
    await page.addInitScript(({ touch }) => {
      const NativeContext = window.AudioContext;
      let gesture = '';
      for (const name of ['pointerdown', 'touchend', 'click', 'keydown']) {
        window.addEventListener(name, () => {
          gesture = name;
          setTimeout(() => { gesture = ''; }, 0);
        }, { capture: true });
      }
      const analysers: AnalyserNode[] = [];
      const connect = AudioNode.prototype.connect;
      AudioNode.prototype.connect = function (this: AudioNode, ...args: [AudioNode | AudioParam, number?, number?]) {
        if (args[0] === this.context.destination) {
          const analyser = analysers[window.audioProbe.contexts.indexOf(this.context as AudioContext)];
          if (analyser) Reflect.apply(connect, this, [analyser]);
        }
        return Reflect.apply(connect, this, args);
      } as typeof connect;
      window.audioProbe = { contexts: [], resumes: [], oscillators: 0, level() {
        const analyser = analysers[0];
        if (!analyser) return 0;
        const samples = new Float32Array(analyser.fftSize);
        analyser.getFloatTimeDomainData(samples);
        return Math.sqrt(samples.reduce((sum, sample) => sum + sample * sample, 0) / samples.length);
      }, harmonics() {
        const analyser = analysers[0];
        const spectrum = new Float32Array(analyser.frequencyBinCount);
        analyser.getFloatFrequencyData(spectrum);
        const binHz = analyser.context.sampleRate / analyser.fftSize;
        return [1, 4, 6].map(harmonic => Math.max(...spectrum.slice(
          Math.ceil(harmonic * 210 / binHz), Math.floor(harmonic * 250 / binHz) + 1)));
      } };
      window.AudioContext = class extends NativeContext {
        constructor(options?: AudioContextOptions) {
          super(options);
          window.audioProbe.contexts.push(this);
          const analyser = this.createAnalyser(); analyser.fftSize = 2048;
          analysers.push(analyser);
        }
        resume() {
          window.audioProbe.resumes.push(gesture);
          // Model mobile eligibility explicitly: Chromium otherwise accepts a
          // touch pointerdown that Safari/other mobile policies may reject.
          if (touch && !['touchend', 'click', 'keydown'].includes(gesture)) return Promise.reject(new Error('Completed touch gesture required'));
          return super.resume();
        }
        createOscillator() { window.audioProbe.oscillators++; return super.createOscillator(); }
      };
    }, { touch });
    await page.goto('/');
    const play = page.getByRole('button', { name: 'Play', exact: true });
    await expect(play).toBeEnabled();
    expect(await page.evaluate(() => window.audioProbe.contexts.length)).toBe(0);
    if (touch) await play.tap(); else await play.click();
    await expect(page.locator('.cloudwake-app')).toHaveAttribute('data-screen', 'playing');
    await expect.poll(() => page.evaluate(() => window.audioProbe.contexts[0].state)).toBe('running');
    // The launch press can make one flutter. It must settle to silence when released.
    await page.waitForTimeout(220);
    expect(await page.evaluate(() => window.audioProbe.level())).toBe(0);
    const holdRise = async () => {
      if (touch) {
        const box = (await page.getByRole('button', { name: 'Hold to rise' }).boundingBox())!;
        await touchSession!.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: box.x + box.width / 2, y: box.y + box.height / 2 }] });
      } else await page.keyboard.down('Space');
    };
    const releaseRise = async () => {
      if (touch) await touchSession!.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      else await page.keyboard.up('Space');
    };
    if (touch) {
      const rise = page.getByRole('button', { name: 'Hold to rise' });
      // Check the actual label span too: the old symptom was a copy/select menu.
      expect(await rise.locator('span').evaluate(element => {
        const style = getComputedStyle(element);
        const event = new Event('touchstart', { bubbles: true, cancelable: true });
        return style.userSelect === 'none' && !element.dispatchEvent(event);
      })).toBe(true);
    }
    await holdRise();
    await expect.poll(() => page.evaluate(() => window.audioProbe.level())).toBeGreaterThan(.0006);
    await page.waitForTimeout(650); // Cross the native long-press threshold with a real held touch.
    expect(await page.evaluate(() => window.audioProbe.level())).toBeLessThan(.006);
    // A bee needs a rich harmonic buzz. The previous smooth tone dropped these
    // upper even harmonics, despite having the right fundamental frequency.
    const [fundamental, fourth, sixth] = await page.evaluate(() => window.audioProbe.harmonics());
    expect(fourth).toBeGreaterThan(fundamental - 24);
    expect(sixth).toBeGreaterThan(fundamental - 30);
    expect(await page.evaluate(() => window.getSelection()?.toString())).toBe('');
    await releaseRise();
    await page.waitForTimeout(220);
    expect(await page.evaluate(() => window.audioProbe.level())).toBe(0);
    const stopped = await page.evaluate(() => window.audioProbe.oscillators);
    await page.waitForTimeout(160);
    expect(await page.evaluate(() => window.audioProbe.oscillators)).toBe(stopped);
    await page.getByRole('button', { name: 'Pause', exact: true }).click();
    await expect.poll(() => page.evaluate(() => window.audioProbe.contexts[0].state)).toBe('suspended');
    const resume = page.getByRole('button', { name: 'Resume', exact: true });
    if (touch) await resume.tap(); else await resume.click();
    await expect.poll(() => page.evaluate(() => window.audioProbe.contexts[0].state)).toBe('running');
    expect(await page.evaluate(() => window.audioProbe.level())).toBe(0);
    await holdRise();
    await expect.poll(() => page.evaluate(() => window.audioProbe.level())).toBeGreaterThan(.0006);
    await releaseRise();
    expect(await page.evaluate(() => window.audioProbe.contexts.length)).toBe(1);
    expect(await page.evaluate(() => window.audioProbe.resumes)).toEqual(touch ? ['click', 'click'] : ['pointerdown', 'click']);
    await page.getByRole('button', { name: 'Pause', exact: true }).click();
    expect(errors).toEqual([]);
  });
});

test('standalone artwork retry unlocks flight and pause preserves a resumable run', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  let failArtwork = true;
  await page.route('**/assets/courier-*.webp', route => failArtwork ? route.abort() : route.continue());
  await page.goto('/');
  const play = page.getByRole('button', { name: 'Play', exact: true });
  await expect(play).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Retry artwork' })).toBeVisible();
  failArtwork = false;
  await page.getByRole('button', { name: 'Retry artwork' }).click();
  await expect(play).toBeEnabled();
  await expect(page.locator('canvas')).toHaveCount(1);
  await expect(page.getByRole('radio')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Game selection' })).toHaveCount(0);
  // The title used to require scrolling even before its instructions were open.
  for (const viewport of [{width:1280,height:720}, {width:360,height:640}, {width:844,height:390}]) {
    await page.setViewportSize(viewport);
    expect(await page.locator('.game-menu-body').evaluate(element => element.scrollHeight <= element.clientHeight + 1)).toBe(true);
    await expect(play).toBeInViewport();
    await expect(page.getByRole('button', {name:'How to play',exact:true})).toBeInViewport();
    await expect(page.getByRole('button', {name:'Mute sound',exact:true})).toBeInViewport();
    await expect(page.getByRole('button', {name:'Fullscreen',exact:true})).toBeInViewport();
  }
  await expect(page.getByRole('link', {name:'Binagora',exact:true})).toHaveAttribute('href', 'https://binagora.com/');
  const source = page.getByRole('link', {name:'GitHub', exact:true});
  await expect(source).toBeVisible();
  await expect(source).toHaveAttribute('href', site.repository);
  await page.getByRole('button', {name:'Mute sound',exact:true}).click();
  await expect(page.getByRole('button', {name:'Unmute sound',exact:true})).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', {name:'How to play',exact:true}).click();
  await expect(page.getByRole('heading', {name:'Flight guide',exact:true})).toBeVisible();
  await expect(source).toBeHidden();
  await expect(page.getByRole('button', {name:'Unmute sound',exact:true})).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', {name:'How to play',exact:true})).toBeFocused();
  await page.setViewportSize({width:1280,height:900});
  await page.getByRole('button', {name:'Fullscreen',exact:true}).click();
  await expect(page.getByRole('button', {name:'Exit fullscreen',exact:true})).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.cloudwake-app')).toHaveAttribute('data-screen', 'title');
  await page.getByRole('button', {name:'Exit fullscreen',exact:true}).click();
  await expect(page.getByRole('button', {name:'Fullscreen',exact:true})).toHaveAttribute('aria-pressed', 'false');
  // Let the display-change suspension settle before launching a new run.
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await play.focus();
  await page.keyboard.down('Space');
  await expect(page.locator('.cloudwake-app')).toHaveAttribute('data-screen', 'playing');
  await page.keyboard.up('Space');
  await page.keyboard.press('KeyP');
  await expect(page.getByRole('heading', { name: 'Paused', exact: true })).toBeVisible();
  await expect(source).toBeHidden();
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await expect(page.locator('.cloudwake-app')).toHaveAttribute('data-screen', 'playing');
  await page.keyboard.press('KeyP');
  expect(errors).toEqual([]);
});
