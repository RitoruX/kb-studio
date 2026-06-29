#!/usr/bin/env node
// Backfill `closed:` on Done task notes that lack a completion date, so the week
// view / weekly summary can place them in the right week. Date source priority:
//   1. a "CLOSED YYYY-MM-DD" line in the body (your existing convention)
//   2. the task's due date
//   3. the file's last-modified date
//
//   node backfill-closed.mjs           # dry run — print what would change
//   node backfill-closed.mjs --write   # apply
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';
import { loadConfig, atomicWrite } from './server/config.js';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const WRITE = process.argv.includes('--write');

function readEnvVault() {
  if (process.env.VAULT_PATH) return process.env.VAULT_PATH;
  try {
    const m = fs.readFileSync(path.join(ROOT, '.env'), 'utf8').match(/^\s*VAULT_PATH\s*=\s*(.*?)\s*$/m);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

const VAULT = readEnvVault();
if (!VAULT) {
  console.error('✖ VAULT_PATH not set (.env). Run `npm run setup` first.');
  process.exit(1);
}

const config = await loadConfig(VAULT);
const F = config.fields;
const SKIP = new Set(['.obsidian', '.git', '.trash', 'node_modules', '_templates']);

function* walk(dir) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    if (e.isDirectory()) {
      if (!SKIP.has(e.name)) yield* walk(path.join(dir, e.name));
    } else if (e.name.endsWith('.md')) {
      yield path.join(dir, e.name);
    }
  }
}

const isTask = (data) => {
  const m = config.taskMatch || {};
  if (m.frontmatter) return Object.entries(m.frontmatter).every(([k, v]) => String(data[k] ?? '') === String(v));
  if (m.tag) {
    const t = data.tags ?? data.tag ?? [];
    return (Array.isArray(t) ? t : [t]).map(String).includes(String(m.tag));
  }
  return false;
};

const ymd = (d) => {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

let scanned = 0;
let missing = 0;
let fixed = 0;
for (const file of walk(VAULT)) {
  let parsed;
  try {
    parsed = matter(fs.readFileSync(file, 'utf8'));
  } catch {
    continue;
  }
  const { data, content } = parsed;
  if (!isTask(data) || String(data[F.status] ?? '') !== config.doneStatus) continue;
  scanned++;
  if (data[F.done]) continue; // already has a completion date
  missing++;

  let date;
  let source;
  const m = content.match(/CLOSED\s+(\d{4}-\d{2}-\d{2})/i);
  if (m) {
    [, date] = m;
    source = 'CLOSED heading';
  } else if (data[F.due]) {
    date = String(data[F.due]);
    source = 'due date';
  } else {
    date = ymd(fs.statSync(file).mtime);
    source = 'file mtime';
  }

  const rel = path.relative(VAULT, file).split(path.sep).join('/');
  console.log(`${WRITE ? 'fixed' : 'would fix'}: ${rel}  →  ${F.done}: ${date}  (${source})`);
  if (WRITE) {
    data[F.done] = date;
    await atomicWrite(file, matter.stringify(content, data));
    fixed++;
  }
}

console.log(`\n${config.doneStatus} notes: ${scanned} · missing ${F.done}: ${missing}` + (WRITE ? ` · stamped ${fixed}` : ''));
if (!WRITE && missing) console.log('Re-run with --write to apply.');
