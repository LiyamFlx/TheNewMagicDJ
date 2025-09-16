import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('MagicDJ Core Flows', () => {
  test('Landing → MagicSet → Player flow works', async ({ page }) => {
    await page.goto('https://the-new-magic-dj.vercel.app/');

    // Start Creating
    await page.getByRole('button', { name: /start creating now/i }).click();

    // Wait for MagicSet card
    await page.waitForSelector('text=MAGICSET', { timeout: 15000 });
    await expect(page.locator('text=MAGICSET')).toBeVisible();

    // Choose vibe + energy
    await page.getByRole('button', { name: /house/i }).click();
    await page.getByRole('button', { name: /groove/i }).click();

    // Generate Set
    await page.getByRole('button', { name: /generate set/i }).click();

    // Verify tracks
    await page.waitForSelector('.track-item', { timeout: 15000 });
    await expect(page.locator('.track-item').first()).toBeVisible();

    // Send to Player
    await page.getByRole('button', { name: /send to player/i }).click();

    // Verify Player
    const playButton = page.locator('button:has-text("Play")');
    await playButton.waitFor({ state: 'visible', timeout: 15000 });
    await playButton.click();
    await expect(page.locator('audio')).toBeVisible();
  });

  test('Landing → MagicMatch → Upload File → Player flow works', async ({ page }) => {
    await page.goto('https://the-new-magic-dj.vercel.app/');

    // Start Creating
    await page.getByRole('button', { name: /start creating now/i }).click();

    // Wait for MagicMatch card
    await page.waitForSelector('text=MAGICMATCH', { timeout: 15000 });
    await expect(page.locator('text=MAGICMATCH')).toBeVisible();

    // Upload Audio File
    const uploadFileButton = page.getByRole('button', { name: /upload audio file/i });
    const filePath = path.resolve(__dirname, '../fixtures/sample.mp3');
    await uploadFileButton.setInputFiles(filePath);

    // Verify recognition results
    await page.waitForSelector('.track-item', { timeout: 15000 });
    await expect(page.locator('.track-item').first()).toBeVisible();

    // Send to Player
    await page.getByRole('button', { name: /send to player/i }).click();

    // Verify Player
    const playButton = page.locator('button:has-text("Play")');
    await playButton.waitFor({ state: 'visible', timeout: 15000 });
    await playButton.click();
    await expect(page.locator('audio')).toBeVisible();
  });

  test('Landing → MagicMatch → Microphone → Player flow works', async ({ page, context }) => {
    // Use fake mic
    await context.grantPermissions(['microphone']);
    await page.goto('https://the-new-magic-dj.vercel.app/', {
      args: [
        '--use-fake-device-for-media-stream',
        `--use-file-for-fake-audio=${path.resolve(__dirname, '../fixtures/sample.wav')}`,
      ],
    });

    // Start Creating
    await page.getByRole('button', { name: /start creating now/i }).click();

    // Wait for MagicMatch card
    await page.waitForSelector('text=MAGICMATCH', { timeout: 15000 });
    await expect(page.locator('text=MAGICMATCH')).toBeVisible();

    // Click microphone capture
    await page.getByRole('button', { name: /listen via microphone/i }).click();

    // Wait for recognition results
    await page.waitForSelector('.track-item', { timeout: 20000 });
    await expect(page.locator('.track-item').first()).toBeVisible();

    // Send to Player
    await page.getByRole('button', { name: /send to player/i }).click();

    // Verify Player
    const playButton = page.locator('button:has-text("Play")');
    await playButton.waitFor({ state: 'visible', timeout: 15000 });
    await playButton.click();
    await expect(page.locator('audio')).toBeVisible();
  });
});
