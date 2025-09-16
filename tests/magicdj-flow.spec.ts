import { test, expect } from '@playwright/test';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';

// ESM-compatible __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const BASE_URL = 'http://localhost:5174';

// Configure retries + artifacts
test.use({
  screenshot: 'only-on-failure',
  video: 'retain-on-failure',
  trace: 'retain-on-failure'
});

test.describe.configure({ retries: 1, timeout: 60000 }); // retry once, 60s max

test.describe('MagicDJ Core Flows (Enhanced)', () => {
  test('Home → MagicSet → Player flow works', async ({ page }) => {
    await page.goto(BASE_URL);

    // Start Creating
    await page.getByRole('button', { name: /start creating now/i }).click();
    await page.goto(`${BASE_URL}/create`);

    // Wait for MagicSet card
    await page.waitForSelector('text=MAGICSET', { timeout: 20000 });
    await expect(page.locator('text=MAGICSET')).toBeVisible();

    // Choose vibe + energy
    await page.getByRole('button', { name: /house/i }).click();
    await page.getByRole('button', { name: /groove/i }).click();

    // Generate Set
    await page.waitForSelector('button:has-text("Generate")', { timeout: 20000 });
    await page.getByRole('button', { name: /generate/i }).click();

    // Verify tracks
    await page.waitForSelector('.track-item', { timeout: 20000 });
    await expect(page.locator('.track-item').first()).toBeVisible();

    // Send to Player
    await page.getByRole('button', { name: /send to player/i }).click();

    // Verify Player playback
    const playButton = page.locator('button:has-text("Play")');
    await playButton.waitFor({ state: 'visible', timeout: 20000 });
    await playButton.click();
    await expect(page.locator('audio')).toBeVisible();
  });

  test('Home → MagicMatch (Upload File) → Player flow works', async ({ page }) => {
    await page.goto(BASE_URL);

    // Start Creating
    await page.getByRole('button', { name: /start creating now/i }).click();
    await page.goto(`${BASE_URL}/create`);

    // Wait for MagicMatch card
    await page.waitForSelector('text=MAGICMATCH', { timeout: 20000 });
    await expect(page.locator('text=MAGICMATCH')).toBeVisible();

    // Upload Audio File
    const uploadFileButton = page.getByRole('button', { name: /upload audio file/i });
    const filePath = path.resolve(__dirname, '../fixtures/sample.mp3');
    await uploadFileButton.setInputFiles(filePath);

    // Verify recognition results
    await page.waitForSelector('.track-item', { timeout: 20000 });
    await expect(page.locator('.track-item').first()).toBeVisible();

    // Send to Player
    await page.getByRole('button', { name: /send to player/i }).click();

    // Verify Player playback
    const playButton = page.locator('button:has-text("Play")');
    await playButton.waitFor({ state: 'visible', timeout: 20000 });
    await playButton.click();
    await expect(page.locator('audio')).toBeVisible();
  });

  test('Home → MagicMatch (Microphone) → Player flow works', async ({ page, context }) => {
    await context.grantPermissions(['microphone']);
    await page.goto(BASE_URL);

    // Start Creating
    await page.getByRole('button', { name: /start creating now/i }).click();
    await page.goto(`${BASE_URL}/create`);

    // Wait for MagicMatch card
    await page.waitForSelector('text=MAGICMATCH', { timeout: 20000 });
    await expect(page.locator('text=MAGICMATCH')).toBeVisible();

    // Start microphone capture
    await page.getByRole('button', { name: /listen via microphone/i }).click();

    // Verify recognition results
    await page.waitForSelector('.track-item', { timeout: 30000 });
    await expect(page.locator('.track-item').first()).toBeVisible();

    // Send to Player
    await page.getByRole('button', { name: /send to player/i }).click();

    // Verify Player playback
    const playButton = page.locator('button:has-text("Play")');
    await playButton.waitFor({ state: 'visible', timeout: 20000 });
    await playButton.click();
    await expect(page.locator('audio')).toBeVisible();
  });
});
