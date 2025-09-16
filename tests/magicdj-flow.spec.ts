import { test, expect } from '@playwright/test';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import fetch from 'node-fetch';

// ESM-compatible __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const BASE_URL = 'http://localhost:5174';
const DIAG_URL = 'http://localhost:9323';
const DIAG_FILE = path.resolve(__dirname, '../diagnostics-report.txt');

// Configure retries + artifacts
test.use({
  screenshot: 'only-on-failure',
  video: 'retain-on-failure',
  trace: 'retain-on-failure'
});

test.describe.configure({ retries: 1, timeout: 60000 }); // retry once, 60s max

// Utility: save diagnostics + attach to report
async function saveDiagnostics(info: any) {
  try {
    const res = await fetch(DIAG_URL);
    if (!res.ok) throw new Error(`Fetch failed with ${res.status}`);
    const text = await res.text();
    fs.writeFileSync(DIAG_FILE, text, 'utf-8');
    console.log(`✅ Diagnostics saved to ${DIAG_FILE}`);

    // Attach into Playwright report
    await info.attach('diagnostics-report', {
      body: text,
      contentType: 'text/plain'
    });
  } catch (err) {
    console.error('⚠ Failed to fetch diagnostics:', err);
  }
}

test.describe('MagicDJ Core Flows (Enhanced with Diagnostics)', () => {
  // Fetch + attach diagnostics once all tests complete
  test.afterAll(async ({}, testInfo) => {
    await saveDiagnostics(testInfo);
  });

  test('Home → MagicSet → Player flow works', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.getByRole('button', { name: /start creating now/i }).click();
    await page.goto(`${BASE_URL}/create`);

    await page.waitForSelector('text=MAGICSET', { timeout: 20000 });
    await expect(page.locator('text=MAGICSET')).toBeVisible();

    await page.getByRole('button', { name: /house/i }).click();
    await page.getByRole('button', { name: /groove/i }).click();

    await page.waitForSelector('button:has-text("Generate")', { timeout: 20000 });
    await page.getByRole('button', { name: /generate/i }).click();

    await page.waitForSelector('.track-item', { timeout: 20000 });
    await expect(page.locator('.track-item').first()).toBeVisible();

    await page.getByRole('button', { name: /send to player/i }).click();

    const playButton = page.locator('button:has-text("Play")');
    await playButton.waitFor({ state: 'visible', timeout: 20000 });
    await playButton.click();
    await expect(page.locator('audio')).toBeVisible();
  });

  test('Home → MagicMatch (Upload File) → Player flow works', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.getByRole('button', { name: /start creating now/i }).click();
    await page.goto(`${BASE_URL}/create`);

    await page.waitForSelector('text=MAGICMATCH', { timeout: 20000 });
    await expect(page.locator('text=MAGICMATCH')).toBeVisible();

    const uploadFileButton = page.getByRole('button', { name: /upload audio file/i });
    const filePath = path.resolve(__dirname, '../fixtures/sample.mp3');
    await uploadFileButton.setInputFiles(filePath);

    await page.waitForSelector('.track-item', { timeout: 20000 });
    await expect(page.locator('.track-item').first()).toBeVisible();

    await page.getByRole('button', { name: /send to player/i }).click();

    const playButton = page.locator('button:has-text("Play")');
    await playButton.waitFor({ state: 'visible', timeout: 20000 });
    await playButton.click();
    await expect(page.locator('audio')).toBeVisible();
  });

  test('Home → MagicMatch (Microphone) → Player flow works', async ({ page, context }) => {
    await context.grantPermissions(['microphone']);
    await page.goto(BASE_URL);
    await page.getByRole('button', { name: /start creating now/i }).click();
    await page.goto(`${BASE_URL}/create`);

    await page.waitForSelector('text=MAGICMATCH', { timeout: 20000 });
    await expect(page.locator('text=MAGICMATCH')).toBeVisible();

    await page.getByRole('button', { name: /listen via microphone/i }).click();

    await page.waitForSelector('.track-item', { timeout: 30000 });
    await expect(page.locator('.track-item').first()).toBeVisible();

    await page.getByRole('button', { name: /send to player/i }).click();

    const playButton = page.locator('button:has-text("Play")');
    await playButton.waitFor({ state: 'visible', timeout: 20000 });
    await playButton.click();
    await expect(page.locator('audio')).toBeVisible();
  });
});
