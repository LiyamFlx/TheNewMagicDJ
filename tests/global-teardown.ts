import type { FullConfig } from '@playwright/test';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Global teardown: Cleaning up test environment...');

  // Cleanup any global resources if needed
  // For now, just log completion

  console.log('✅ Test environment cleanup completed');
}

export default globalTeardown;