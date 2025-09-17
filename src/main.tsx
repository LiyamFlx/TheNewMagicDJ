import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';

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
