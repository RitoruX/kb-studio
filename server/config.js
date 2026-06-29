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
  // where "file as note" sends non-task inbox items (a standalone .md per item)
  notePath: 'Notes',
  // where the week view writes weekly-summary snapshots (one .md per ISO week)
  weeklyPath: 'Weekly',
  // deleted task notes are moved here (Obsidian's trash convention) instead of erased
  trashPath: '.trash',
  // name shown atop the weekly summary (e.g. how you sign it in the team chat)
  weeklyAuthor: '',
  // status note appended after each task in the weekly summary, one "Status = note"
  // per line. A "normal | end-of-week" value differs by when you write the summary
  // (Mon vs Fri/Sat). Edit in Settings (translate to your language). Empty = no notes.
  weeklyStatusNotes:
    'To do = TODO | not started\nDoing = in progress\nIn Review = in review\nDone = เรียบร้อยแล้ว',
  // prefix before a blocked task's reason, e.g. "Blocked <reason>"
  weeklyBlockedLabel: 'Blocked',
  // frontmatter field names + how the grouping value is derived
  fields: {
    title: 'title',
    status: 'status',
    due: 'due',
    // completion date (the vault's existing `closed:` convention), stamped
    // automatically when a task enters doneStatus and cleared when it leaves —
    // drives the week view's "Done this week" section
    done: 'closed',
    // boolean "I'm stuck on this" flag, independent of status/due
    blocked: 'blocked',
    // optional free-text reason; only kept while blocked is true
    blockReason: 'blockReason',
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

// Write a file atomically: write a temp sibling, then rename over the target. A
// crash or a sync/AV lock can never leave a half-written file — the rename either
// fully succeeds or leaves the old file intact. Critical because the source of
// truth is your markdown vault, usually inside OneDrive.
export async function atomicWrite(file, content) {
  const tmp = `${file}.tmp-${process.pid}`;
  await fs.writeFile(tmp, content, 'utf8');
  try {
    await fs.rename(tmp, file);
  } catch (e) {
    await fs.rm(tmp, { force: true }).catch(() => {});
    throw e;
  }
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
  await atomicWrite(file, JSON.stringify(merged, null, 2) + '\n');
  return loadConfig(vault);
}
