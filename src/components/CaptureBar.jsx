import { useRef, useState } from 'react';

// Parse the textarea into a title (line 1) + detail bullets (the rest).
function parse(text) {
  const lines = text.split('\n');
  const title = (lines[0] || '').replace(/^\s*-\s*(\[.\]\s*)?/, '').trim();
  const details = lines
    .slice(1)
    .map((l) => l.replace(/^\s*-\s*/, '').trim())
    .filter(Boolean);
  return { title, details };
}

export default function CaptureBar({ onCapture }) {
  const [text, setText] = useState('');
  const [saved, setSaved] = useState(false);
  const ref = useRef(null);

  function reset() {
    setText('');
    if (ref.current) ref.current.style.height = 'auto';
  }

  async function submit() {
    const { title, details } = parse(text);
    if (!title) return;
    reset();
    await onCapture(title, details);
    setSaved(true);
    setTimeout(() => setSaved(false), 1200);
  }

  function grow() {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 180) + 'px';
  }

  function onKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    } else if (e.key === 'Enter' && e.shiftKey) {
      // start a new indented detail bullet at the cursor
      e.preventDefault();
      const el = e.target;
      const { selectionStart, selectionEnd, value } = el;
      const insert = '\n  - ';
      const next = value.slice(0, selectionStart) + insert + value.slice(selectionEnd);
      setText(next);
      requestAnimationFrame(() => {
        el.selectionStart = el.selectionEnd = selectionStart + insert.length;
        grow();
      });
    } else if (e.key === 'Escape') {
      reset();
      e.target.blur();
    }
  }

  return (
    <div className="relative flex-1">
      <textarea
        id="capture-input"
        ref={ref}
        rows={1}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          grow();
        }}
        onKeyDown={onKeyDown}
        placeholder="＋ Dump to inbox… (c) · Shift+Enter for details · Enter to save"
        className="w-full resize-none rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm leading-5 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
      />
      {saved && (
        <span className="absolute right-3 top-2 text-xs font-medium text-emerald-600">✓ captured</span>
      )}
    </div>
  );
}
