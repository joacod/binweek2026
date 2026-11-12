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
