import { test, expect } from '@playwright/test';

test.describe('MagicDJ Core Flow', () => {
  test('Landing → Studio → Player flow works', async ({ page }) => {
    // Go to landing page
    await page.goto('https://the-new-magic-dj.vercel.app/');

    // Verify landing loads
    await expect(page).toHaveTitle(/MagicDJ/i);

    // Navigate to Magic Studio
    await page.click('text=Magic Studio');

    // Wait for studio to load
    await expect(page).toHaveURL(/.*studio/);
    await expect(page.locator('text=Generate Set')).toBeVisible();

    // Generate a set
    await page.click('text=Generate Set');

    // Verify tracks appear
    await expect(page.locator('.track-item').first()).toBeVisible();

    // Send to Player
    await page.click('text=Send to Player');

    // Verify Player page
    await expect(page).toHaveURL(/.*player/);

    // Check playback controls exist
    const playButton = page.locator('button:has-text("Play")');
    await expect(playButton).toBeVisible();

    // Try pressing play
    await playButton.click();

    // Verify audio element present
    const audioElement = page.locator('audio');
    await expect(audioElement).toBeVisible();
  });
});

