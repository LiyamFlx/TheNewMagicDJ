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

test.describe.configure({ retries: 1, timeout: 60000 });

// Utility: save diagnostics + attach to report
async function saveDiagnostics(info: any) {
  try {
    const res = await fetch(DIAG_URL);
    if (!res.ok) throw new Error(`Fetch failed with ${res.status}`);
    const text = await res.text();
    fs.writeFileSync(DIAG_FILE, text, 'utf-8');
    console.log(`✅ Diagnostics saved to ${DIAG_FILE}`);
    await info.attach('diagnostics-report', { body: text, contentType: 'text/plain' });
  } catch (err) {
    console.error('⚠ Failed to fetch diagnostics:', err);
  }
}

// Reusable helper: validate player controls
async function validatePlayerControls(page) {
  const playBtn = page.locator('button:has-text("Play")');
  const pauseBtn = page.locator('button:has-text("Pause")');
  const stopBtn = page.locator('button:has-text("Stop")');
  const nextBtn = page.locator('button:has-text("Next")');
  const saveBtn = page.locator('button:has-text("Save Playlist")');

  await playBtn.waitFor({ state: 'visible', timeout: 20000 });
  await playBtn.click();
  await expect(page.locator('audio')).toBeVisible();

  if (await pauseBtn.isVisible()) {
    await pauseBtn.click();
    await expect(page.locator('audio')).toBeVisible();
  }

  if (await stopBtn.isVisible()) {
    await stopBtn.click();
    await expect(page.locator('audio')).toBeVisible();
  }

  if (await nextBtn.isVisible()) {
    await nextBtn.click();
    await expect(page.locator('.track-item').nth(1)).toBeVisible();
  }

  if (await saveBtn.isVisible()) {
    await saveBtn.click();
    await page.waitForSelector('text=Playlist saved', { timeout: 10000 });
    await expect(page.locator('text=Playlist saved')).toBeVisible();
  }
}

test.describe('MagicDJ Core Flows (Full Player Journey)', () => {
  test.afterAll(async ({}, testInfo) => {
    await saveDiagnostics(testInfo);
  });

  test('Home → MagicSet → Full Player Journey', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.getByRole('button', { name: /start creating now/i }).click();
    await page.goto(`${BASE_URL}/create`);

    await page.waitForSelector('text=MAGICSET', { timeout: 20000 });
    await page.getByRole('button', { name: /house/i }).click();
    await page.getByRole('button', { name: /groove/i }).click();

    await page.getByRole('button', { name: /generate/i }).click();
    await page.waitForSelector('.track-item', { timeout: 20000 });

    await page.getByRole('button', { name: /send to player/i }).click();

    // Validate full player controls
    await validatePlayerControls(page);
  });

  test('Home → MagicMatch (Upload File) → Full Player Journey', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.getByRole('button', { name: /start creating now/i }).click();
    await page.goto(`${BASE_URL}/create`);

    await page.waitForSelector('text=MAGICMATCH', { timeout: 20000 });

    const uploadFileButton = page.getByRole('button', { name: /upload audio file/i });
    const filePath = path.resolve(__dirname, '../fixtures/sample.mp3');
    await uploadFileButton.setInputFiles(filePath);

    await page.waitForSelector('.track-item', { timeout: 20000 });
    await page.getByRole('button', { name: /send to player/i }).click();

    // Validate full player controls
    await validatePlayerControls(page);
  });

  test('Home → MagicMatch (Microphone) → Full Player Journey', async ({ page, context }) => {
    await context.grantPermissions(['microphone']);
    await page.goto(BASE_URL);
    await page.getByRole('button', { name: /start creating now/i }).click();
    await page.goto(`${BASE_URL}/create`);

    await page.waitForSelector('text=MAGICMATCH', { timeout: 20000 });
    await page.getByRole('button', { name: /listen via microphone/i }).click();

    await page.waitForSelector('.track-item', { timeout: 30000 });
    await page.getByRole('button', { name: /send to player/i }).click();

    // Validate full player controls
    await validatePlayerControls(page);
  });
});
