import { chromium, type FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  // Warm up the application and ensure it's accessible
  const baseURL = process.env.VERCEL_URL || 'https://the-new-magic-dj.vercel.app';
  const bypassToken = process.env.VERCEL_BYPASS_TOKEN;

  const url = bypassToken
    ? `${baseURL}?x-vercel-set-bypass-cookie=true&x-vercel-protection-bypass=${bypassToken}`
    : baseURL;

  try {
    console.log('🚀 Global setup: Warming up application...');
    await page.goto(url, { timeout: 30000 });

    // Wait for the app to load
    await page.waitForSelector('body', { timeout: 10000 });

    console.log('✅ Application is accessible and responsive');
  } catch (error) {
    console.warn('⚠️ Application warm-up failed:', error);
    // Don't fail the entire test suite if warm-up fails
  }

  await browser.close();
}

export default globalSetup;