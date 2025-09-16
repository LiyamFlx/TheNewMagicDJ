import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

test.describe('MagicDJ Core Flows', () => {
  test('Landing → MagicSet → Player flow works', async ({ page }) => {
    await page.goto('https://the-new-magic-dj.vercel.app/');

    // Start Creating Now
    await page.getByRole('button', { name: /start creating now/i }).click();
    await expect(page).toHaveURL(/.*create/);

    // MagicSet card visible
    await expect(page.locator('text=MAGICSET')).toBeVisible();

    // Choose vibe + energy
    await page.getByRole('button', { name: /house/i }).click();
    await page.getByRole('button', { name: /groove/i }).click();

    // Generate Set
    await page.getByRole('button', { name: /generate set/i }).click();
    await expect(page.locator('.track-item').first()).toBeVisible();

    // Send to Player
    await page.getByRole('button', { name: /send to player/i }).click();
    await expect(page).toHaveURL(/.*player/);

    // Playback controls
    const playButton = page.locator('button:has-text("Play")');
    await expect(playButton).toBeVisible();
    await playButton.click();
    await expect(page.locator('audio')).toBeVisible();
  });

  test('Landing → MagicMatch → Upload File flow works', async ({ page }) => {
    await page.goto('https://the-new-magic-dj.vercel.app/');

    // Start Creating Now
    await page.getByRole('button', { name: /start creating now/i }).click();
    await expect(page).toHaveURL(/.*create/);

    // MagicMatch card visible
    await expect(page.locator('text=MAGICMATCH')).toBeVisible();

    // Upload Audio File (robust: target actual <input type="file">)
    const filePath = path.join(process.cwd(), 'tests', 'fixtures', 'sample.mp3');
    if (!fs.existsSync(filePath)) {
      test.skip(true, 'tests/fixtures/sample.mp3 not found');
    }

    // Try labeled file input first, fallback to any file input
    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toBeVisible();
    await fileInput.setInputFiles(filePath);

    // Verify track detection / processing result
    await expect(page.locator('.track-item').first()).toBeVisible();

    // Send to Player
    await page.getByRole('button', { name: /send to player/i }).click();
    await expect(page).toHaveURL(/.*player/);

    // Playback controls
    const playButton = page.locator('button:has-text("Play")');
    await expect(playButton).toBeVisible();
    await playButton.click();
    await expect(page.locator('audio')).toBeVisible();
  });
});
