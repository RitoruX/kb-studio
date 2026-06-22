# KB Studio — UX/UI Redesign · Progress

Steering: **taste-skill / `redesign-existing-projects`** (scan → diagnose → fix).
Brief: `.aidlc/uxui-kickoff.md` (gitignored). Stack: React 18 + Tailwind v4 + Vite.

## Phase 1 — Design system / tokens · ✅ done (2026-06-22)

Established a semantic token layer so every other phase (and dark mode) rides on it.

**Diagnosis fixed**
- No token layer → raw `slate-*`/`blue-*`/`white` scattered across components.
- Two+ competing accents (slate + blue + a third `#2563eb` link).
- Hardcoded hex islands in `.md-body`.
- Proportional figures on data (counts, due dates) — jittered.
- Untinted pure-black shadows on cool surfaces.

**Changes**
- `src/index.css` — `@theme inline` token layer: color tokens (canvas / surface / panel /
  line / line-strong / ink / muted / faint / accent / accent-fg / accent-weak), font tokens
  (`--font-sans`, `--font-mono`), tinted slate-hued shadows (`shadow-card` / `-hover` / `-raised`).
  Values in `:root` (light) with a staged `.dark` scope — dark mode is now a one-scope flip.
  `.md-body` prose colors moved onto tokens.
- Single accent: indigo-blue `#4263eb` (replaces ad-hoc blue focus/drop-zone colors).
- One gray family (cool slate) kept consistent.
- `src/App.jsx`, `src/components/Column.jsx`, `src/components/CardView.jsx` — core board
  surfaces migrated to token utilities. Counts + due dates now `tabular-nums`.

**Verified**: `npm run build` clean; confirmed token utilities (`bg-canvas`, `shadow-card`,
`bg-accent-weak`, `ring-accent`, …) + raw `--kb-*` vars present in compiled CSS.

**Full migration done (2026-06-22):** every component now on tokens —
`TaskModal`, `SettingsModal`, `InboxDrawer`, `SearchBox`, `CaptureBar`, `TodayView`, plus the
board surfaces. Inputs share one token field style; primary CTAs use `bg-accent`, ghosts use
`hover:bg-panel`. Side effect: compiled CSS shrank 42.9 kB → 27.6 kB (fewer unique utilities).

**Intentionally left literal:** `constants.js` STATUS_COLORS / project palette (config-driven —
must stay literal so Tailwind keeps the classes); semantic status colors (red/amber/emerald/cyan
for overdue / due-soon / captured / review); modal scrims (`bg-slate-900/40`, correct in dark too).

## Phase 2 — Board interaction & density · ✅ done (2026-06-22)

**Diagnosis fixed**
- Cards focusable but no visible focus ring + Enter/Space didn't open them.
- No tactile press feedback anywhere (brand voice is "tactile").
- No focus-visible rings on buttons/tabs (keyboard nav invisible).
- Loading was bare "Loading…" text.
- Comfortable, not dense (`w-72` / `p-3` / `gap-4`).
- No `prefers-reduced-motion` guard.

**Changes**
- `src/index.css` — base interaction layer: one accent `:focus-visible` outline for every
  `button`/`a`/`[role=button]`; global button `transition` + tactile `:active` press (0.5px,
  skips `:disabled`); `prefers-reduced-motion` guard. DRY — no per-control focus/active classes.
- `src/components/CardView.jsx` — keyboard-first: cards open on Enter/Space (role/tabIndex set for
  the static Today list; dnd-kit supplies them on the board), `active:scale-[0.99]` press, denser
  padding (`p-3`→`p-2.5`).
- `src/components/Column.jsx` — density: `w-72`→`w-64`, card gap/well padding tightened.
- `src/components/BoardSkeleton.jsx` (new) — skeleton board matching column/card shape; replaces
  the loading text in `App.jsx`. Board gap `gap-4`→`gap-3`.

**Motion philosophy (recorded):** dense daily-driver → micro-interactions only (hover / press /
focus / drag-lift). Deliberately NO macro entrance animations / staggered card cascades — they'd
jank a 100-card board and slow a keyboard-first user. Applying the skill's "keep it fast" rule over
its landing-page entrance reflexes.

**Verified:** `npm run build` clean (48 modules); confirmed `focus-visible`, `prefers-reduced-motion`,
button press transform, `animate-pulse`, `w-64` in compiled CSS; running server serves the new build.

## Phase 3 — Task/detail editing · ✅ done (2026-06-22)

All on `src/components/TaskModal.jsx` (the detail editor), respecting existing Save semantics.

**Diagnosis fixed**
- Silent data loss: backdrop/Esc discarded unsaved edits with no warning.
- No power-user save key from the description textarea.
- Esc was blunt (closed the modal mid-typing instead of leaving edit mode).
- Not a real dialog: no `role=dialog`/`aria-modal`/labelledby, no focus trap, no focus restore.
- "click to edit" was a mouse-only `<span>`.

**Changes**
- Dirty-tracking (`initialRef` snapshot vs `form`) → **"Unsaved" pill** in the heading; **backdrop
  click closes only when clean** (guards against mis-click discard). Cancel/Esc still explicit.
- **⌘/Ctrl+Enter saves** from anywhere (incl. description); placeholder teaches it.
- **Esc** leaves description edit mode (formats source) when typing there; otherwise closes.
- Real dialog: `role="dialog"` + `aria-modal` + `aria-labelledby`, **Tab focus trap**, and
  **focus restored** to the opening card on close (loops with Phase 2's focusable cards).
- "click to edit" → a keyboard-reachable **Edit** button (avoids nesting interactives inside the
  rendered-markdown area, which holds the interactive checkboxes).

**Verified:** `npm run build` clean; confirmed `Unsaved`, `aria-modal`, `task-modal-title`, `⌘↵`,
`metaKey` in built JS; server serves the new build.

## Phase 4 — Responsive · ✅ done (2026-06-22)

**Diagnosis fixed**
- TaskModal Due/Status/Project was a fixed 3-col grid (crushed on phones).
- Settings fields were a fixed 2-col grid.
- SearchBox fixed `w-72` + `w-[28rem]` dropdown overflowed small screens.
- Uniform `p-5`/`px-5` padding ate width on phones.
- `min-h-screen` (=100vh) → iOS Safari viewport jump.
- Touch swipe started a card drag instead of scrolling the board.

**Changes**
- `src/App.jsx` — `min-h-screen`→`min-h-dvh`; header/main padding `px-3 sm:px-5`, `p-3 sm:p-5`.
  **Touch DnD:** replaced `PointerSensor` with `MouseSensor` (8px) + `TouchSensor`
  (200ms hold, 8px tolerance) so swipes scroll and a hold drags.
- `src/components/SearchBox.jsx` — `w-full sm:w-72`; dropdown `w-full sm:w-[28rem]`.
- `src/components/TaskModal.jsx` — field row `grid-cols-1 sm:grid-cols-3`; `pt-10 sm:pt-20`,
  `p-4 sm:p-5`.
- `src/components/SettingsModal.jsx` — field grid `grid-cols-1 sm:grid-cols-2`; `p-4 sm:p-5`.

**Verified:** `npm run build` clean; confirmed `min-h-dvh` + `sm:` variants in compiled CSS, touch
sensors compiled (minifier-renamed in JS), server serves the new build. Touch DnD not runtime-tested
(no browser here).

---

## ✅ All four brief focus areas complete (design system · interaction/density · editing · responsive).
Redesign steered end-to-end by taste-skill / `redesign-existing-projects`.

## Dark mode — ✅ shipped (2026-06-22)

The Phase-1 token layer paid off: surfaces flipped via the staged `.dark` scope; the work was the
toggle + pointing `dark:` at the class + dark variants for non-tokenized semantic chips.

**Changes**
- `src/index.css` — `@custom-variant dark (&:where(.dark, .dark *))` so `dark:` follows the
  `.dark` class (Tailwind v4 defaults `dark:` to the OS media query — a manual override needs this).
- `index.html` — inline no-FOUC script: applies the theme class before paint from
  `localStorage['kb-theme']` (default `system`) + `prefers-color-scheme`.
- `src/theme.js` (new) — get/set/apply/resolve; `.dark` class on `<html>` is the source of truth.
- `src/components/ThemeToggle.jsx` (new) — header button cycling **System → Light → Dark** (system
  detection over a binary sun/moon switch, per the skill); live-reacts to OS changes in system mode.
- Dark variants for semantic chips that aren't tokenized (would otherwise glow as pastels):
  due badges (`CardView`), project palette (`constants.js`), `HeadsUp`, error box (`App`),
  `TodayView` section tones, delete/remove hovers (`TaskModal`/`InboxDrawer`/`SettingsModal`),
  capture confirmation (`CaptureBar`).

**Verified:** `npm run build` clean; confirmed `.dark{--kb-canvas:…}` override, class-scoped
`:where(.dark,.dark *)` variant selector, generated `dark:` chip utilities, and the no-FOUC script
in served HTML. Not eyeballed in a browser (no pilot here).

## Geist webfont — ✅ shipped (2026-06-22)

Self-hosted (local-first — no CDN/runtime network). Tokens made it the promised ~one-line swap.

**Changes**
- Deps: `@fontsource-variable/geist` + `@fontsource-variable/geist-mono` (only new direct deps).
- `src/main.jsx` — `import '@fontsource-variable/geist/wght.css'` + the mono `wght.css` (upright
  variable weight axis; skipped italics to keep `dist` lean — markdown italics are faux-italic).
- `src/index.css` — `--font-sans: "Geist Variable", …`, `--font-mono: "Geist Mono Variable", …`,
  system fallbacks kept.

**Verified:** `npm run build` clean; Geist woff2 bundled into `dist/assets` (latin sans 29.4 kB,
mono 29.9 kB + on-demand subsets via `unicode-range`); families referenced in built CSS; server
serves `geist-latin-…woff2` as `font/woff2` 200. Not eyeballed in a browser.

Note: `npm install` flagged 2 pre-existing moderate vulns (vite/esbuild dev deps), unrelated to
fonts — did NOT run `audit fix --force` (breaking/risky).

## Theme retarget — "Warm Editorial" · ✅ done (2026-06-22)

Validated the token architecture: changed the whole look by editing **only token values** — no
component logic touched, so all 4 phases + dark mode + Geist are preserved intact.

- `src/index.css` — `:root` → warm-stone grays + ivory paper (`--kb-canvas #f7f5f1`, ink `#292524`),
  single calm ink-blue accent `#3b6fd4`; `.dark` → warm charcoal (`#14110d`, accent `#6f9cf0`);
  shadows re-tinted warm (`rgb(41 37 36)`).
- Warmed modal scrims `bg-slate-900/*` → `bg-stone-900/*` (TaskModal/SettingsModal/InboxDrawer)
  for cohesion. Semantic status chips (red/amber) intentionally unchanged.

**Verified:** `npm run build` clean; confirmed warm `:root`/`.dark` `--kb-canvas`, accent values,
`bg-stone-900` scrim utility in compiled CSS; server serves the new build. Not eyeballed in a browser.

To switch themes again: edit the `:root` + `.dark` token blocks in `src/index.css` (and optionally
the shadow hue + scrim color). Nothing else.

## Deferred decisions
- **Dark palette tuning** — sensible defaults; worth an eyeball pass for accent/chip contrast in
  real use (esp. dark `--kb-accent` `#6678ff` + `--kb-accent-fg`).

## Next phases (from brief scope)
2. Board interaction & density · 3. Task/detail editing · 4. Responsive.
