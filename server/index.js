import express from 'express';
import fs from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';
import { loadConfig, saveConfig, atomicWrite } from './config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env ourselves if it wasn't injected via `node --env-file` — this lets
// pm2 (and a plain `node server/index.js`) work without extra flags.
if (!process.env.VAULT_PATH) {
  try {
    for (const line of readFileSync(path.join(__dirname, '..', '.env'), 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    }
  } catch {
    /* no .env file */
  }
}

const VAULT_PATH = process.env.VAULT_PATH;
const PORT = process.env.PORT || 3001;

if (!VAULT_PATH) {
  console.error('VAULT_PATH is not set. Copy .env.example to .env and set it.');
  process.exit(1);
}

let config = await loadConfig(VAULT_PATH); // reloaded on PUT /api/config

const app = express();
app.use(express.json());

// ---------- path helpers ----------
const abs = (rel) => path.join(VAULT_PATH, rel);
const relId = (a) => path.relative(VAULT_PATH, a).split(path.sep).join('/');

function resolveId(id) {
  const a = path.resolve(VAULT_PATH, id);
  if (!a.startsWith(path.resolve(VAULT_PATH))) throw new Error('Path escapes vault');
  return a;
}

const slugify = (s) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'task';

// local (not UTC) YYYY-MM-DD — the done stamp must match the user's calendar day
const todayLocal = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

// ---------- excludes + walking ----------
function excludeSets() {
  const dirs = new Set();
  const subs = [];
  for (const e of config.searchExclude || []) {
    if (e.includes('/')) subs.push(e); // path-substring match
    else dirs.add(e); // plain dir name prunes the walk
  }
  return { dirs, subs };
}

async function* walkMarkdown(dir, ex) {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    if (e.isDirectory()) {
      if (ex.dirs.has(e.name)) continue;
      const child = path.join(dir, e.name);
      if (ex.subs.some((s) => relId(child).includes(s))) continue;
      yield* walkMarkdown(child, ex);
    } else if (e.name.endsWith('.md')) {
      yield path.join(dir, e.name);
    }
  }
}

const scanRoots = () => {
  const roots = config.includeRoots?.length ? config.includeRoots : ['.'];
  return roots.map((r) => (r === '.' ? VAULT_PATH : abs(r)));
};

// ---------- task identity / fields ----------
function isTask(data) {
  const m = config.taskMatch || {};
  if (m.folder) return true;
  if (m.frontmatter) return Object.entries(m.frontmatter).every(([k, v]) => String(data[k] ?? '') === String(v));
  if (m.tag) {
    const t = data.tags ?? data.tag ?? [];
    return (Array.isArray(t) ? t : [t]).map(String).includes(String(m.tag));
  }
  return false;
}

function deriveGroup(data, rel) {
  const g = config.fields.group || {};
  if (g.key && data[g.key] !== undefined && data[g.key] !== null) return String(data[g.key]);
  if (g.folderSegment != null) {
    const seg = rel.split('/')[g.folderSegment] || '';
    if (!seg || seg.endsWith('.md') || seg.startsWith('_') || seg === config.noGroupFolder) return '';
    return seg;
  }
  return '';
}

function toTask(data, content, a) {
  const f = config.fields;
  const rel = relId(a);
  return {
    id: rel,
    title: data[f.title] || path.basename(a, '.md'),
    description: content.trim(),
    status: data[f.status] || config.statuses[0]?.name || 'Backlog',
    due: data[f.due] ? String(data[f.due]) : '',
    done: f.done && data[f.done] ? String(data[f.done]) : '',
    blocked: f.blocked ? !!data[f.blocked] : false,
    blockReason: f.blockReason && data[f.blockReason] ? String(data[f.blockReason]) : '',
    project: deriveGroup(data, rel),
  };
}

async function readTask(a) {
  const { data, content } = matter(await fs.readFile(a, 'utf8'));
  return toTask(data, content, a);
}

// A short kind label for a search hit: frontmatter `type` if present, else the
// top folder with its leading number prefix stripped ("20-Meetings" -> "Meeting").
function classify(data, rel) {
  const t = data.type ?? data.kind;
  if (t) return String(t);
  const top = (rel.split('/')[0] || '').replace(/^\d+[-_]\s*/, '');
  return top ? top.replace(/s$/, '') : 'note';
}

async function listTasks() {
  const ex = excludeSets();
  const seen = new Set();
  const out = [];
  for (const root of scanRoots()) {
    for await (const a of walkMarkdown(root, ex)) {
      const rel = relId(a);
      if (seen.has(rel)) continue;
      seen.add(rel);
      try {
        const { data, content } = matter(await fs.readFile(a, 'utf8'));
        if (isTask(data)) out.push(toTask(data, content, a));
      } catch {
        /* skip unreadable note */
      }
    }
  }
  return out;
}

const tasksDirForGroup = (group) =>
  abs((config.newTaskPath || '{group}').replace('{group}', group || config.noGroupFolder || '_Unsorted'));

function buildFrontmatter(existing, patch) {
  const f = config.fields;
  const data = { ...existing };
  if (config.taskMatch?.frontmatter) Object.assign(data, config.taskMatch.frontmatter);
  if (patch.title !== undefined) data[f.title] = patch.title.trim();
  if (patch.status !== undefined) data[f.status] = patch.status;
  if (patch.due !== undefined) data[f.due] = patch.due || '';
  if (patch.group !== undefined && f.group?.key) data[f.group.key] = patch.group || '';
  if (patch.blocked !== undefined) {
    if (patch.blocked) data[f.blocked] = true;
    else {
      delete data[f.blocked];
      delete data[f.blockReason]; // reason is meaningless once unblocked
    }
  }
  if (patch.blockReason !== undefined && f.blockReason) {
    if (patch.blockReason && data[f.blocked]) data[f.blockReason] = patch.blockReason.trim();
    else delete data[f.blockReason];
  }
  // Stamp a completion date the first time a task enters Done; clear it if it
  // leaves Done. Lets the week view answer "what did I finish this week?".
  if (f.done) {
    const status = patch.status !== undefined ? patch.status : data[f.status];
    if (status === config.doneStatus) {
      if (!data[f.done]) data[f.done] = todayLocal();
    } else {
      delete data[f.done];
    }
  }
  return data;
}

const writeNote = (a, body, data) =>
  atomicWrite(a, matter.stringify(body.trim() ? body.trim() + '\n' : '', data));

async function createTaskFile({ project = '', title, description = '', status, due = '', blocked, blockReason }) {
  const dir = tasksDirForGroup(project);
  await fs.mkdir(dir, { recursive: true });
  const base = slugify(title);
  let name = `${base}.md`;
  let i = 2;
  while (existsSync(path.join(dir, name))) name = `${base}-${i++}.md`;
  const a = path.join(dir, name);
  // blocked/blockReason carried through so an "undo delete" restores them
  const data = buildFrontmatter(
    {},
    { title, group: project, due, status: status || config.statuses[0]?.name, blocked, blockReason }
  );
  await writeNote(a, description, data);
  return a;
}

// ---------- inbox ----------
const inboxPath = () => abs(config.inbox?.path || '_Inbox.md');
const captureHeading = () => config.inbox?.heading || '## 📥 Captured';
const stripComments = (s) => s.replace(/<!--.*?-->/g, '');

// An inbox item is an open task line (`- [ ] …`) plus any indented lines beneath
// it (detail sub-bullets). `raw` is the whole block, used as its identity.
async function readInboxItems() {
  let raw;
  try {
    raw = await fs.readFile(inboxPath(), 'utf8');
  } catch {
    return [];
  }
  const lines = raw.split('\n');
  const items = [];
  for (let i = 0; i < lines.length; ) {
    const m = lines[i].match(/^-\s*\[ \]\s+(.*)$/);
    if (!m) {
      i++;
      continue;
    }
    const start = i++;
    const details = [];
    while (i < lines.length && /^\s+\S/.test(lines[i])) {
      const d = stripComments(lines[i].replace(/^\s*-\s*/, '')).trim();
      if (d) details.push(d);
      i++;
    }
    items.push({ raw: lines.slice(start, i).join('\n'), text: stripComments(m[1]).trim(), details });
  }
  return items;
}

// Render an item as its markdown block: a checkbox line + indented detail bullets.
const inboxBlock = (text, details = []) =>
  [
    `- [ ] ${String(text).trim()}`,
    ...(details || []).map((d) => String(d).trim()).filter(Boolean).map((d) => `  - ${d}`),
  ].join('\n');

// Replace a block (matched verbatim by `raw`) with `replacement`; null = delete it.
async function spliceInboxBlock(raw, replacement) {
  if (!raw) return;
  let fileRaw;
  try {
    fileRaw = await fs.readFile(inboxPath(), 'utf8');
  } catch {
    return;
  }
  const fileLines = fileRaw.split('\n');
  const block = raw.split('\n');
  for (let s = 0; s + block.length <= fileLines.length; s++) {
    if (block.every((bl, k) => fileLines[s + k] === bl)) {
      fileLines.splice(s, block.length, ...(replacement == null ? [] : replacement.split('\n')));
      await atomicWrite(inboxPath(), fileLines.join('\n'));
      return;
    }
  }
}
const removeInboxBlock = (raw) => spliceInboxBlock(raw, null);

// Non-task items are filed into the KB as a standalone note (title -> H1 + filename).
const notesDir = () => abs(config.notePath || 'Notes');
async function createNoteFile({ title, body = '', project = '' }) {
  const dir = notesDir();
  await fs.mkdir(dir, { recursive: true });
  const base = slugify(title);
  let name = `${base}.md`;
  let i = 2;
  while (existsSync(path.join(dir, name))) name = `${base}-${i++}.md`;
  const a = path.join(dir, name);
  const content = (`# ${String(title).trim()}\n\n${body || ''}`).trim() + '\n';
  const data = { created: new Date().toISOString().slice(0, 10) };
  if (project) data.project = project; // records which project the note belongs to
  await atomicWrite(a, matter.stringify(content, data));
  return a;
}

// ---------- API: health (used by `npm run doctor`) ----------
app.get('/api/health', (_req, res) => res.json({ ok: true, vault: VAULT_PATH }));

// ---------- API: config ----------
app.get('/api/config', (_req, res) => res.json(config));

app.put('/api/config', async (req, res) => {
  try {
    config = await saveConfig(VAULT_PATH, req.body || {});
    res.json(config);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// ---------- API: tasks ----------
app.get('/api/projects', async (_req, res) => {
  try {
    const groups = new Set();
    for (const t of await listTasks()) if (t.project) groups.add(t.project);
    res.json([...groups].sort());
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.get('/api/tasks', async (_req, res) => {
  try {
    res.json(await listTasks());
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.post('/api/tasks', async (req, res) => {
  try {
    if (!req.body.title?.trim()) return res.status(400).json({ error: 'title required' });
    res.status(201).json(await readTask(await createTaskFile(req.body)));
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.patch('/api/tasks', async (req, res) => {
  try {
    const { id, title, description, status, due, project, blocked, blockReason } = req.body;
    if (!id) return res.status(400).json({ error: 'id required' });

    const src = resolveId(id);
    const { data, content } = matter(await fs.readFile(src, 'utf8'));
    const patch = {};
    if (title !== undefined) patch.title = title;
    if (status !== undefined) patch.status = status;
    if (due !== undefined) patch.due = due;
    if (project !== undefined) patch.group = project;
    if (blocked !== undefined) patch.blocked = blocked;
    if (blockReason !== undefined) patch.blockReason = blockReason;
    const next = buildFrontmatter(data, patch);
    const body = description !== undefined ? description : content;

    let target = src;
    if (project !== undefined && project !== deriveGroup(data, relId(src))) {
      const dir = tasksDirForGroup(project);
      await fs.mkdir(dir, { recursive: true });
      target = path.join(dir, path.basename(src));
    }

    await writeNote(target, body, next);
    if (target !== src) await fs.rm(src);
    res.json(await readTask(target));
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.delete('/api/tasks', async (req, res) => {
  try {
    if (!req.query.id) return res.status(400).json({ error: 'id required' });
    // soft-delete: move into <trashPath>/ (mirroring the path), recoverable in Obsidian
    const src = resolveId(req.query.id);
    const dest = abs(path.join(config.trashPath || '.trash', relId(src)));
    await fs.mkdir(path.dirname(dest), { recursive: true });
    let target = dest;
    for (let i = 2; existsSync(target); i++) target = dest.replace(/\.md$/i, `-${i}.md`);
    await fs.rename(src, target);
    res.json({ ok: true, trashed: relId(target) });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// ---------- API: inbox ----------
app.get('/api/inbox', async (_req, res) => {
  try {
    res.json(await readInboxItems());
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.post('/api/inbox', async (req, res) => {
  try {
    const { text, details } = req.body;
    if (!text?.trim()) return res.status(400).json({ error: 'text required' });
    let raw = '';
    try {
      raw = await fs.readFile(inboxPath(), 'utf8');
    } catch {
      /* inbox not created yet */
    }
    const heading = captureHeading();
    const entry = inboxBlock(text, details);
    const next = raw.includes(heading)
      ? raw.replace(heading, `${heading}\n${entry}`)
      : `${raw.replace(/\s*$/, '')}\n\n${heading}\n${entry}\n`;
    await atomicWrite(inboxPath(), next);
    res.status(201).json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// edit an inbox item in place (title + details)
app.put('/api/inbox', async (req, res) => {
  try {
    const { raw, text, details } = req.body;
    if (!raw || !text?.trim()) return res.status(400).json({ error: 'raw and text required' });
    await spliceInboxBlock(raw, inboxBlock(text, details));
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// file a non-task item into the KB as a standalone note, then drop it from the inbox
app.post('/api/inbox/file-note', async (req, res) => {
  try {
    const { raw, title, body, project } = req.body;
    if (!title?.trim()) return res.status(400).json({ error: 'title required' });
    const a = await createNoteFile({ title, body, project });
    await removeInboxBlock(raw);
    res.status(201).json({ ok: true, file: relId(a) });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.post('/api/inbox/promote', async (req, res) => {
  try {
    if (!req.body.title?.trim()) return res.status(400).json({ error: 'title required' });
    const a = await createTaskFile(req.body);
    await removeInboxBlock(req.body.raw);
    res.status(201).json(await readTask(a));
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.delete('/api/inbox', async (req, res) => {
  try {
    if (!req.query.raw) return res.status(400).json({ error: 'raw required' });
    await removeInboxBlock(req.query.raw);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// ---------- API: weekly snapshot ----------
// Does this week's snapshot already exist? (drives the Fri/Sat save reminder)
app.get('/api/weekly', (req, res) => {
  const week = String(req.query.week || '').replace(/[^0-9A-Za-z-]/g, '');
  if (!week) return res.status(400).json({ error: 'week required' });
  const a = path.join(abs(config.weeklyPath || 'Weekly'), `${week}.md`);
  res.json({ exists: existsSync(a), file: relId(a) });
});

// Save a weekly-summary draft to <weeklyPath>/<week>.md. Create-only: if the
// file exists we leave it (you may have edited it) and report `existed`.
app.post('/api/weekly', async (req, res) => {
  try {
    const { week, body, force } = req.body;
    if (!week || !body?.trim()) return res.status(400).json({ error: 'week and body required' });
    const dir = abs(config.weeklyPath || 'Weekly');
    await fs.mkdir(dir, { recursive: true });
    const a = path.join(dir, `${String(week).replace(/[^0-9A-Za-z-]/g, '')}.md`);
    if (existsSync(a) && !force) return res.json({ file: relId(a), existed: true });
    await atomicWrite(a, body.trim() + '\n');
    res.status(201).json({ file: relId(a), existed: false });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// ---------- API: search ----------
app.get('/api/search', async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    if (q.length < 2) return res.json([]);
    const needle = q.toLowerCase();
    const ex = excludeSets();
    const LIMIT = 50;
    const matches = [];

    for await (const a of walkMarkdown(VAULT_PATH, ex)) {
      let raw;
      try {
        raw = await fs.readFile(a, 'utf8');
      } catch {
        continue;
      }
      if (!raw.toLowerCase().includes(needle)) continue;
      let data = {};
      let body = raw;
      try {
        ({ data, content: body } = matter(raw));
      } catch {
        /* not valid frontmatter — search the raw text */
      }
      const rel = relId(a);
      const title =
        data[config.fields.title] || raw.match(/^#\s+(.+)$/m)?.[1]?.trim() || path.basename(a, '.md');
      // snippet from the first body line that matches; fall back to the title line
      let snippet = '';
      let line = 0;
      const lines = body.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].toLowerCase().includes(needle)) {
          snippet = lines[i].trim().slice(0, 200);
          line = i + 1;
          break;
        }
      }
      matches.push({
        file: rel,
        dir: rel.includes('/') ? rel.slice(0, rel.lastIndexOf('/')) : '',
        kind: classify(data, rel),
        title: String(title),
        snippet,
        line,
        inTitle: String(title).toLowerCase().includes(needle),
      });
      if (matches.length >= 80) break;
    }
    // title matches first, then alphabetical by path
    matches.sort((a, b) => b.inTitle - a.inTitle || a.file.localeCompare(b.file));
    res.json(matches.slice(0, LIMIT));
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// ---------- serve built frontend ----------
const dist = path.join(__dirname, '..', 'dist');
if (existsSync(dist)) {
  app.use(express.static(dist));
  app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

app.listen(PORT, () => {
  console.log(`KB Studio API → http://localhost:${PORT}`);
  console.log(`Vault         → ${VAULT_PATH}`);
});
