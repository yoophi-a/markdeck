import React from 'react';
import ReactDOM from 'react-dom/client';

import { App } from '@/App';
import '@/globals.css';

if (import.meta.env.DEV) {
  void import('react-grab');
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
