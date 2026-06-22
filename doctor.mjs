#!/usr/bin/env node
// Quick health check: is the server up and pointed at a vault?
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
let port = 3001;
try {
  const m = fs.readFileSync(path.join(ROOT, '.env'), 'utf8').match(/^\s*PORT\s*=\s*(\d+)/m);
  if (m) port = Number(m[1]);
} catch {
  /* default port */
}

try {
  const res = await fetch(`http://localhost:${port}/api/health`);
  const body = await res.json();
  if (body.ok) {
    console.log(`✓ KB Studio is up on http://localhost:${port}`);
    console.log(`  vault: ${body.vault}`);
    process.exit(0);
  }
  throw new Error('unhealthy response');
} catch {
  console.error(`✖ KB Studio is not responding on http://localhost:${port}.`);
  console.error('  Start it with:  npm run serve   (or: npm run dev)');
  process.exit(1);
}
