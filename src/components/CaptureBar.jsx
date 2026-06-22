import { useState } from 'react';

export default function CaptureBar({ onCapture }) {
  const [text, setText] = useState('');
  const [saved, setSaved] = useState(false);

  async function submit() {
    const t = text.trim();
    if (!t) return;
    setText('');
    await onCapture(t);
    setSaved(true);
    setTimeout(() => setSaved(false), 1200);
  }

  return (
    <div className="relative flex-1">
      <input
        id="capture-input"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        placeholder="＋ Dump to inbox… (press c)"
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
      />
      {saved && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-emerald-600">
          ✓ captured
        </span>
      )}
    </div>
  );
}
