import { useEffect, useRef, useState } from 'react';
import { SearchMd } from '@untitledui/icons';
import { searchVault } from '../api';
import { useConfig } from '../ConfigContext';

// badge color by kind — task leads green, meetings amber, the rest warm-neutral
function kindClass(kind = '') {
  const k = kind.toLowerCase();
  if (k === 'task') return 'bg-accent-weak text-accent';
  if (k.startsWith('meet')) return 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300';
  if (k === 'decision') return 'bg-clay-weak text-clay';
  return 'bg-panel text-muted';
}

// split text on every case-insensitive occurrence of q, wrapping matches in <mark>
function highlight(text, q) {
  if (!text) return null;
  const lower = text.toLowerCase();
  const ql = q.toLowerCase();
  const out = [];
  let idx = 0;
  let key = 0;
  for (let pos = lower.indexOf(ql); pos !== -1; pos = lower.indexOf(ql, idx)) {
    if (pos > idx) out.push(text.slice(idx, pos));
    out.push(
      <mark key={key++} className="rounded bg-amber-200/70 px-0.5 text-inherit dark:bg-amber-400/30">
        {text.slice(pos, pos + q.length)}
      </mark>
    );
    idx = pos + q.length;
  }
  out.push(text.slice(idx));
  return out;
}

export default function SearchBox() {
  const config = useConfig();
  // best-effort deep link into Obsidian (vault name from config)
  const obsidianHref = (file) =>
    `obsidian://open?vault=${encodeURIComponent(config.obsidianVault || '')}&file=${encodeURIComponent(
      file.replace(/\.md$/, '')
    )}`;
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sel, setSel] = useState(0);
  const boxRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        setResults(await searchVault(q));
        setSel(0);
        setOpen(true);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    const h = (e) => boxRef.current && !boxRef.current.contains(e.target) && setOpen(false);
    window.addEventListener('mousedown', h);
    return () => window.removeEventListener('mousedown', h);
  }, []);

  // keep the highlighted row in view as you arrow through
  useEffect(() => {
    listRef.current?.querySelector(`[data-idx="${sel}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [sel]);

  function onKeyDown(e) {
    if (!open || !results.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSel((s) => Math.min(s + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSel((s) => Math.max(s - 1, 0));
    } else if (e.key === 'Enter' && results[sel]) {
      e.preventDefault();
      window.location.href = obsidianHref(results[sel].file);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  return (
    <div ref={boxRef} className="relative w-full sm:w-72">
      <SearchMd size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
      <input
        id="search-input"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => results.length && setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder="Search the vault… (press /)"
        className="w-full rounded-lg border border-line-strong bg-surface py-1.5 pl-9 pr-3 text-sm text-ink placeholder:text-faint focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
      />

      {open && q.trim().length >= 2 && (
        <div
          ref={listRef}
          className="pop-in absolute right-0 z-30 mt-1 max-h-[70vh] w-full overflow-y-auto rounded-xl border border-line bg-surface p-1 shadow-raised sm:w-[28rem]"
        >
          {loading && results.length === 0 ? (
            <p className="px-3 py-2 text-sm text-faint">Searching…</p>
          ) : results.length === 0 ? (
            <p className="px-3 py-2 text-sm text-faint">
              No matches for “{q.trim()}”. Try fewer or different words.
            </p>
          ) : (
            <>
              {results.map((r, i) => (
                <a
                  key={r.file}
                  data-idx={i}
                  href={obsidianHref(r.file)}
                  onMouseEnter={() => setSel(i)}
                  className={[
                    'block cursor-pointer rounded-lg px-3 py-2 transition',
                    i === sel ? 'bg-accent-weak' : 'hover:bg-panel',
                  ].join(' ')}
                  title="Open in Obsidian"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${kindClass(
                        r.kind
                      )}`}
                    >
                      {r.kind}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">
                      {highlight(r.title, q)}
                    </span>
                    {r.dir && <span className="shrink-0 font-mono text-[10px] text-faint">{r.dir}</span>}
                  </div>
                  {r.snippet && <p className="mt-0.5 truncate text-xs text-muted">{highlight(r.snippet, q)}</p>}
                </a>
              ))}
              <div className="flex gap-3 border-t border-line px-3 py-1.5 text-[11px] text-faint">
                <span>
                  <kbd className="rounded border border-line-strong px-1 font-mono">↑↓</kbd> move
                </span>
                <span>
                  <kbd className="rounded border border-line-strong px-1 font-mono">↵</kbd> open
                </span>
                <span className="ml-auto">title matches first</span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
