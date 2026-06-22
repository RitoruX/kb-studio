#!/usr/bin/env node
// One-shot setup: find the Obsidian vault, write .env, and generate a starter
// kb-studio.config.json that matches the vault. Safe to re-run.
//
//   node setup.mjs                      # auto-detect the vault
//   node setup.mjs --vault "/path/..."  # specify it explicitly
//   node setup.mjs --force              # overwrite an existing .env
//
// Run AFTER `npm install` (it uses gray-matter).
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const force = args.includes('--force');
const vaultArg = ((i) => (i !== -1 ? args[i + 1] : null))(args.indexOf('--vault'));

const SKIP_DIRS = new Set(['.obsidian', '.git', '.trash', 'node_modules']);

function obsidianConfigPath() {
  if (process.platform === 'darwin') return path.join(os.homedir(), 'Library/Application Support/obsidian/obsidian.json');
  if (process.platform === 'win32') return path.join(process.env.APPDATA || '', 'obsidian', 'obsidian.json');
  return path.join(os.homedir(), '.config/obsidian/obsidian.json');
}

function detectVaults() {
  try {
    const j = JSON.parse(fs.readFileSync(obsidianConfigPath(), 'utf8'));
    return Object.values(j.vaults || {})
      .map((v) => v.path)
      .filter((p) => p && fs.existsSync(p));
  } catch {
    return [];
  }
}

function resolveVault() {
  if (vaultArg) return vaultArg;
  const vaults = detectVaults();
  if (vaults.length === 1) return vaults[0];
  if (vaults.length === 0) {
    console.error('✖ No Obsidian vault auto-detected.\n  Re-run: node setup.mjs --vault "/full/path/to/your/vault"');
    process.exit(1);
  }
  console.error('Multiple Obsidian vaults found — pick one and re-run:');
  for (const v of vaults) console.error(`  node setup.mjs --vault "${v}"`);
  process.exit(1);
}

function walk(dir, onFile, budget = { n: 4000 }) {
  if (budget.n <= 0) return;
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    if (budget.n <= 0) return;
    if (e.isDirectory()) {
      if (!SKIP_DIRS.has(e.name)) walk(path.join(dir, e.name), onFile, budget);
    } else if (e.name.endsWith('.md')) {
      budget.n -= 1;
      onFile(path.join(dir, e.name));
    }
  }
}

const COLORS = ['slate', 'violet', 'blue', 'cyan', 'amber', 'emerald', 'rose', 'indigo'];

function detectConfig(vault) {
  const roots = new Set();
  const statuses = new Set();
  let found = 0;
  walk(vault, (file) => {
    try {
      const { data } = matter(fs.readFileSync(file, 'utf8'));
      if (String(data.type) === 'task') {
        found += 1;
        const rel = path.relative(vault, file).split(path.sep).join('/');
        roots.add(rel.split('/')[0]);
        if (data.status) statuses.add(String(data.status));
      }
    } catch {
      /* ignore */
    }
  });

  // sensible cross-vault defaults; tasks are `type: task` notes, new ones go to Tasks/<group>/
  const cfg = {
    taskMatch: { frontmatter: { type: 'task' } },
    includeRoots: found ? [...roots] : [],
    newTaskPath: 'Tasks/{group}',
    noGroupFolder: '_Unsorted',
    fields: { title: 'title', status: 'status', due: 'due', group: { key: 'project', folderSegment: 1 } },
    statuses: [
      { name: 'Backlog', color: 'slate' },
      { name: 'To do', color: 'violet' },
      { name: 'Doing', color: 'blue' },
      { name: 'In Review', color: 'cyan' },
      { name: 'Done', color: 'emerald' },
    ],
    doneStatus: 'Done',
    activeStatuses: ['Doing'],
    reviewStatuses: ['In Review'],
    groupLabel: 'Project',
    noGroupLabel: 'No project',
    inbox: { path: '_Inbox.md', heading: '## 📥 Captured' },
    searchExclude: ['.obsidian', '.git', '_templates', 'node_modules'],
    obsidianVault: path.basename(vault),
  };

  // adopt the vault's own status values, but never end up with a broken board:
  // a rich set (≥3) replaces the defaults; a sparse one just appends extras.
  if (statuses.size) {
    const disc = [...statuses];
    if (disc.length >= 3) {
      const known = new Map(cfg.statuses.map((s) => [s.name, s.color]));
      cfg.statuses = disc.map((name, i) => ({ name, color: known.get(name) || COLORS[i % COLORS.length] }));
    } else {
      const have = new Set(cfg.statuses.map((s) => s.name));
      disc.filter((n) => !have.has(n)).forEach((name, i) => cfg.statuses.push({ name, color: COLORS[i % COLORS.length] }));
    }
    if (!cfg.statuses.some((s) => s.name === cfg.doneStatus)) {
      cfg.doneStatus = disc.find((s) => /done|complete|closed/i.test(s)) || cfg.statuses.at(-1).name;
    }
  }
  return { cfg, found };
}

// ---- run ----
const vault = resolveVault();
if (!fs.existsSync(vault)) {
  console.error(`✖ Vault path does not exist: ${vault}`);
  process.exit(1);
}

const envPath = path.join(ROOT, '.env');
if (fs.existsSync(envPath) && !force) {
  console.log(`• .env already exists (keeping it). Use --force to overwrite.`);
} else {
  fs.writeFileSync(envPath, `VAULT_PATH=${vault}\nPORT=3001\n`);
  console.log(`✓ Wrote .env → VAULT_PATH=${vault}`);
}

const cfgPath = path.join(vault, 'kb-studio.config.json');
if (fs.existsSync(cfgPath)) {
  console.log('• kb-studio.config.json already exists in the vault (keeping it).');
} else {
  const { cfg, found } = detectConfig(vault);
  fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2) + '\n');
  console.log(`✓ Wrote ${cfgPath}`);
  console.log(found ? `  (detected ${found} existing task notes)` : `  (no existing tasks — starter config; new tasks go to Tasks/<group>/)`);
}

console.log('\nNext: npm run build  →  npm run serve  (then open http://localhost:3001)');
