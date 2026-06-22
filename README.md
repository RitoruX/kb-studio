# KB Studio

A local-first kanban board over an Obsidian (markdown) vault. Every task is just a
`.md` note — this app is a faster drag-and-drop view over those files. No account,
no cloud, no lock-in. Obsidian still opens the same notes.

## ✨ Easiest setup — let Claude do it

Install [Claude Code](https://claude.com/claude-code), open it in this repo's folder, and say:

> **"Set up KB Studio for me following CLAUDE.md."**

Claude installs Node + dependencies, finds your Obsidian vault, generates a config
that matches it, builds the app, and starts it so it stays running (and relaunches
on reboot). Then open **http://localhost:3001**. See `CLAUDE.md` for the human guide.

## Manual setup

```bash
npm install
node setup.mjs          # detects your Obsidian vault, writes .env + config
npm run build
npm run serve           # runs it via pm2 (keep-alive); or `npm run dev` for development
```

`npm run doctor` checks it's up. `.env` holds `VAULT_PATH` + `PORT`.

## Run (development)

```bash
npm run dev
```

- API → http://localhost:3001
- Board → http://localhost:5173

Open the board in any browser. Drag cards between columns, click a card to edit
(title · description · due date), use **+ Add task** to create one.

## Run as a single server (optional)

```bash
npm run build && npm start
```

Then everything is served from http://localhost:3001.

## Using it on any vault (configuration)

KB Studio runs on its built-in defaults with **no config** (the author's
`10-Projects/<project>/Tasks/` + `type: task` layout). To adapt it to a different
vault, drop a **`kb-studio.config.json`** in the vault root — see
`kb-studio.config.example.json`. Anything you omit falls back to the default.

Common knobs (statuses/colors, labels, Obsidian vault name, inbox file, search
excludes) are editable in-app via the **⚙ Settings** panel. Structural keys live in
the JSON:

| Key | Meaning |
|---|---|
| `taskMatch` | how a note is recognized as a task: `{frontmatter:{type:"task"}}` · `{tag:"task"}` · `{folder:true}` |
| `includeRoots` | folders to scan (`[]` = whole vault) |
| `newTaskPath` | where new task files go; `{group}` is substituted |
| `fields` | frontmatter field names for title/status/due + how `group` is derived (frontmatter `key` and/or folder `folderSegment`) |
| `statuses` / `doneStatus` | board columns (name + color) and which one means done |
| `activeStatuses` / `reviewStatuses` | which statuses fill the Today view's "in progress" / "in review" sections |

### Preset: flat vault, tasks are tagged notes
```json
{
  "taskMatch": { "tag": "task" },
  "includeRoots": [],
  "newTaskPath": "Tasks",
  "fields": { "title": "title", "status": "status", "due": "due", "group": { "key": "area" } },
  "groupLabel": "Area"
}
```

### Preset: PARA vault, a folder per project, any note in it is a task
```json
{
  "taskMatch": { "folder": true },
  "includeRoots": ["1-Projects"],
  "newTaskPath": "1-Projects/{group}",
  "fields": { "group": { "folderSegment": 1 } }
}
```

## How it maps to the vault

| In the app | In the file |
|---|---|
| Card title | `title:` frontmatter |
| Description | the markdown body |
| Due date | `due:` frontmatter |
| Column | `status:` (Backlog / To do / Doing / Done) |
| Project tab / move | the `Tasks/` folder it lives in + `project:` |

Moving a card to another project relocates its note file. Editing never renames
the file, so `[[wikilinks]]` stay intact.

## Columns

Defined in one place — `src/constants.js` (`STATUSES`). Add `'Blocked'` there if
you want it back.

## Capture & search (Phase 2)

- **Capture bar** (header): type + Enter appends `- [ ] …` under a `## 📥 Captured`
  heading in `_Inbox.md` — same file your phone/Obsidian capture uses.
- **Inbox drawer** (📥 button): lists open `- [ ]` lines from `_Inbox.md`. “→ Make task”
  files the line into a project (opens the task editor) and removes it from the inbox.
- **Search box** (header): full-text search across the vault. Excludes `60-Access/`
  (credentials), `99-Archive/`, `_templates/`, and the gated `databases/WH` schema tree.
  Results deep-link into Obsidian (`obsidian://`, assumes the vault is named `KB`).

## Working-day features

- **Today view** (header toggle or press `t`): time-based lens — Overdue · Due today ·
  This week · In progress — your "what now" across all projects.
- **Keyboard shortcuts:** `c` capture · `/` search · `n` new task · `t` toggle Today.
- **Interactive checklists:** tick `- [ ]` boxes in a task's rendered description; the
  change is written straight back to the markdown and saved.
- **Heads-up banner:** "N overdue · N due today" when you open the app. The 🔔 button opts
  into a browser notification with the same summary on load.

## Roadmap

- **Phase 1 ✅:** kanban board.
- **Phase 2 ✅:** `_Inbox.md` quick-capture + triage + global vault search.
- **Working-day pass ✅:** Today view, shortcuts, checklists, heads-up/notifications.
- **Phone:** inbox-only by design — capture from phone via the OneDrive `_Inbox.md`; the
  board stays on desktop. (No PWA/LAN exposure.)
- **Phase 3 (open):** browse meetings / decisions / docs (rendered), project dashboards.
