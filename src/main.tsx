import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { logger } from './utils/logger';

// Global error handlers for debugging Chrome extension/iframe issues
window.addEventListener('error', (event: ErrorEvent) => {
  if (
    event.message.includes(
      'message channel closed before a response was received'
    )
  ) {
    console.warn('Chrome extension iframe messaging error (can be ignored):', {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      error: event.error,
    });
    // This error is common with Chrome extensions and usually safe to ignore
    event.preventDefault();
    return false;
  }

  // Log other errors normally
  logger._error('App', 'Unhandled error', event.error);
});

window.addEventListener('unhandledrejection', event => {
  if (
    event.reason?.message?.includes(
      'message channel closed before a response was received'
    )
  ) {
    console.warn('Chrome extension promise rejection (can be ignored):', {
      reason: event.reason,
      stack: event.reason?.stack,
    });
    // This rejection is common with Chrome extensions and usually safe to ignore
    event.preventDefault();
    return false;
  }

  // Log other rejections normally
  logger._error('App', 'Unhandled promise rejection', event.reason);
});

// Clear any existing Service Workers in development
if (import.meta.env.DEV) {
  import('./utils/clearServiceWorkers')
    .then(() => {
      console.log('Service Workers cleanup initialized');
    })
    .catch(err => {
      console.warn('Service Workers cleanup failed:', err);
    });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
