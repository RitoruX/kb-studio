import React from 'react';
import { createRoot } from 'react-dom/client';
// Self-hosted Geist (variable weight axis, upright). Local-first: bundled into the
// build, the browser only fetches the latin subset via unicode-range.
import '@fontsource-variable/geist/wght.css';
import '@fontsource-variable/geist-mono/wght.css';
import App from './App.jsx';
import './index.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
