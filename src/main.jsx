import React from 'react';
import { createRoot } from 'react-dom/client';
// Self-hosted Geist (variable weight axis, upright). Local-first: bundled into the
// build, the browser only fetches the latin subset via unicode-range.
import '@fontsource-variable/geist/wght.css';
import '@fontsource-variable/geist-mono/wght.css';
// Thai script support — Geist has no Thai glyphs; browser falls back per character
import '@fontsource/noto-sans-thai/400.css';
import '@fontsource/noto-sans-thai/500.css';
import '@fontsource/noto-sans-thai/600.css';
import '@fontsource/noto-sans-thai/700.css';
import App from './App.jsx';
import './index.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
