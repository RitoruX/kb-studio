import { useEffect, useRef, useState } from 'react';
import { searchVault } from '../api';
import { useConfig } from '../ConfigContext';

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
  const boxRef = useRef(null);

  useEffect(() => {
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        setResults(await searchVault(q));
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

  return (
    <div ref={boxRef} className="relative w-72">
      <input
        id="search-input"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => results.length && setOpen(true)}
        placeholder="🔍 Search the vault… (press /)"
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
      />

      {open && q.trim().length >= 2 && (
        <div className="absolute right-0 z-30 mt-1 max-h-[70vh] w-[28rem] overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl">
          {loading && results.length === 0 ? (
            <p className="px-3 py-2 text-sm text-slate-400">Searching…</p>
          ) : results.length === 0 ? (
            <p className="px-3 py-2 text-sm text-slate-400">No matches.</p>
          ) : (
            results.map((r) => (
              <a
                key={r.file}
                href={obsidianHref(r.file)}
                className="block rounded-lg px-3 py-2 hover:bg-slate-50"
                title="Open in Obsidian"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-sm font-medium text-slate-800">{r.title}</span>
                  <span className="shrink-0 text-[11px] text-slate-400">{r.file}</span>
                </div>
                {r.snippet && <p className="mt-0.5 truncate text-xs text-slate-500">{r.snippet}</p>}
              </a>
            ))
          )}
        </div>
      )}
    </div>
  );
}
