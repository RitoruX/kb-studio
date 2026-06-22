import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

export const CONFIG_FILE = 'kb-studio.config.json';

// Layout-agnostic defaults: with NO config file, KB Studio scans the whole vault
// for `type: task` notes and writes new ones under `Tasks/<group>/`. Any vault can
// drop a kb-studio.config.json in its root to override any of these
// (see kb-studio.config.example.json).
export const DEFAULTS = {
  // how a markdown note is recognised as a task:
  //   { frontmatter: { type: "task" } }  | { tag: "task" } | { folder: true }
  taskMatch: { frontmatter: { type: 'task' } },
  // limit the task scan to these top roots ([] = whole vault, minus excludes)
  includeRoots: [],
  // where new task files are written; {group} -> the group value (or noGroupFolder)
  newTaskPath: 'Tasks/{group}',
  noGroupFolder: '_Unsorted',
  // frontmatter field names + how the grouping value is derived
  fields: {
    title: 'title',
    status: 'status',
    due: 'due',
    // group: read from frontmatter `key` first, else the Nth folder segment
    group: { key: 'project', folderSegment: 1 },
  },
  statuses: [
    { name: 'Backlog', color: 'slate' },
    { name: 'To do', color: 'violet' },
    { name: 'Doing', color: 'blue' },
    { name: 'In Review', color: 'cyan' },
    { name: 'Done', color: 'emerald' },
  ],
  doneStatus: 'Done',
  // Today view non-date sections (status-driven); empty arrays hide the section
  activeStatuses: ['Doing'],
  reviewStatuses: ['In Review'],
  groupLabel: 'Project',
  noGroupLabel: 'No project',
  inbox: { path: '_Inbox.md', heading: '## 📥 Captured' },
  // dir names (no slash) prune the walk; entries with a slash match path substrings
  searchExclude: [
    '.obsidian',
    '.git',
    '.trash',
    '_templates',
    'node_modules',
  ],
  obsidianVault: '', // '' => derived from the vault folder name
};

function deepMerge(base, over) {
  if (Array.isArray(over)) return over.slice();
  if (over && typeof over === 'object') {
    const out = base && typeof base === 'object' && !Array.isArray(base) ? { ...base } : {};
    for (const k of Object.keys(over)) out[k] = deepMerge(out[k], over[k]);
    return out;
  }
  return over === undefined ? base : over;
}

export async function loadConfig(vault) {
  let cfg = deepMerge(DEFAULTS, {});
  const file = path.join(vault, CONFIG_FILE);
  if (existsSync(file)) {
    try {
      cfg = deepMerge(DEFAULTS, JSON.parse(await fs.readFile(file, 'utf8')));
    } catch (e) {
      console.error(`Ignoring invalid ${CONFIG_FILE}: ${e}`);
    }
  }
  if (!cfg.obsidianVault) cfg.obsidianVault = path.basename(vault);
  return cfg;
}

export async function saveConfig(vault, partial) {
  const file = path.join(vault, CONFIG_FILE);
  let current = {};
  if (existsSync(file)) {
    try {
      current = JSON.parse(await fs.readFile(file, 'utf8'));
    } catch {
      /* overwrite invalid file */
    }
  }
  const merged = deepMerge(current, partial || {});
  await fs.writeFile(file, JSON.stringify(merged, null, 2) + '\n', 'utf8');
  return loadConfig(vault);
}
