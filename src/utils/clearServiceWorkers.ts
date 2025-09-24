// Utility to clear any existing Service Workers during development
export const clearServiceWorkers = async (): Promise<void> => {
  if ('serviceWorker' in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(
        registrations.map(registration => registration.unregister())
      );
      console.log('✅ Cleared all Service Worker registrations');
    } catch (_error) {
      console.warn('⚠️ Could not clear Service Worker registrations:', _error);
    }
  }
};

// Auto-clear in development mode
if (import.meta.env.DEV) {
  clearServiceWorkers();
}
