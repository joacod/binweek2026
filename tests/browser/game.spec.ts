import { test, expect } from '@playwright/test';

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
  await page.getByRole('button', {name:'Mute sound',exact:true}).click();
  await expect(page.getByRole('button', {name:'Unmute sound',exact:true})).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', {name:'How to play',exact:true}).click();
  await expect(page.getByRole('heading', {name:'Flight guide',exact:true})).toBeVisible();
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
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await expect(page.locator('.cloudwake-app')).toHaveAttribute('data-screen', 'playing');
  await page.keyboard.press('KeyP');
  expect(errors).toEqual([]);
});
