# KB Studio — setup & operation guide

KB Studio is a small local web app that turns an Obsidian (markdown) vault into a
fast drag-and-drop task board. Every task is just a `.md` note, so nothing is
locked in. It runs entirely on this computer — no account, no cloud.

---

## 🤖 If you are an AI agent (Claude), set it up like this

Do these steps in order. Stop and ask the human only where noted. Detect the OS
(`process.platform`: `darwin` = macOS, `win32` = Windows) and use the matching commands.

**1. Check Node.js (need ≥ 18).** Run `node -v`.
   - If missing/old — macOS: `brew install node` (or download from nodejs.org).
   - Windows: `winget install OpenJS.NodeJS.LTS`.

**2. Install dependencies** (from the repo folder): `npm install`

**3. Point it at her vault + generate config:** `node setup.mjs`
   - It auto-detects her Obsidian vault. If it reports **multiple** vaults or
     **none**, ask her which folder her notes are in, then re-run:
     `node setup.mjs --vault "<full path>"`
   - This writes `.env` (the vault path) and a starter `kb-studio.config.json`
     **inside her vault**. Then refine that config — see "Customizing" below.

**4. Build the UI:** `npm run build`

**5. Run it and keep it alive** (pm2 — restarts on crash and on reboot):
   ```
   npm install -g pm2
   npm run serve            # pm2 start + pm2 save
   ```
   Make it start on boot:
   - macOS/Linux: run `pm2 startup` and execute the command it prints (may need `sudo`).
   - Windows: `npm install -g pm2-windows-startup` then `pm2-startup install`.

**6. Verify:** `npm run doctor` → should say it's up on http://localhost:3001.

**7. Hand off.** Tell her: *"Your board is at http://localhost:3001 — bookmark it.
   It starts automatically when you turn on your computer."* Then point her at the
   "For you" section below. Do not leave the server in a dev/foreground state.

---

## 🔧 Customizing the config for her vault (agent)

`setup.mjs` writes a sensible starter, but tailor `kb-studio.config.json` (in the
vault root) to how she actually works. Inspect her vault and set:

- **`taskMatch`** — how a note counts as a task: `{ "frontmatter": { "type": "task" } }`
  (default), or `{ "tag": "task" }`, or `{ "folder": true }` (any note in the scanned folders).
- **`includeRoots`** — folders to scan (`[]` = whole vault).
- **`newTaskPath`** — where new task files are created; `{group}` is substituted (e.g. `"Tasks/{group}"`).
- **`fields.group`** — how the grouping value is read: `{ "key": "project" }` (frontmatter)
  and/or `{ "folderSegment": 1 }` (Nth folder in the path).
- **`statuses`** / **`doneStatus`** — board columns (name + color) and which means done.

Full reference + presets (flat tag-based vault, PARA folder vault) are in `README.md`
and `kb-studio.config.example.json`. After editing, `npm run restart`.

---

## 🧑 For you (the human)

**To set it up the first time:** open Claude Code in this folder and say:
> *"Set up KB Studio for me following CLAUDE.md."*
That's it — Claude does everything above.

**Daily use** (open **http://localhost:3001**, bookmark it):
- **Capture** anything in the top "＋ Dump to inbox" box (or press `c`). Triage it later from the 📥 Inbox.
- **Add a task**: click **+ Add task** in a column, type a title, Enter.
- **Move** a card by dragging; **click** a card to add a description (markdown — `[]` makes a checkbox), due date, project.
- **Today** tab (or press `t`) shows what's overdue / due today / in progress.

**Customize it** (no coding):
- Click **⚙ Settings** to rename columns, change colors, set labels, etc.
- Or just ask Claude: *"add a 'Waiting' column to my board"*, *"change my vault path"*, etc.

**It's all your files.** Tasks are markdown notes in your vault; Obsidian still opens them.

---

## 🔄 Updating to the latest version

```
git pull
npm install
npm run build
npm run restart
```

## 🆘 Troubleshooting (ask Claude, or:)
- **Board won't open / blank:** `npm run doctor`. If down, `npm run serve`.
- **"Port in use":** something's already on 3001 — `npm run restart`, or change `PORT` in `.env`.
- **Wrong/empty board:** the vault path or config is off — re-run `node setup.mjs --vault "<path>"` and check `kb-studio.config.json`.
- **See logs:** `npm run logs`.
