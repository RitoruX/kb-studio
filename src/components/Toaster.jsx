import { useEffect, useState } from 'react';
import { Check, AlertTriangle, XClose } from '@untitledui/icons';
import { subscribeToast } from '../toast';

const TONE = {
  success: { Icon: Check, cls: 'text-accent' },
  error: { Icon: AlertTriangle, cls: 'text-red-600 dark:text-red-400' },
  info: { Icon: null, cls: 'text-muted' },
};

export default function Toaster() {
  const [toasts, setToasts] = useState([]);

  const dismiss = (id) => setToasts((prev) => prev.filter((t) => t.id !== id));

  useEffect(
    () =>
      subscribeToast((t) => {
        setToasts((prev) => [...prev, t]);
        if (t.duration) setTimeout(() => dismiss(t.id), t.duration);
      }),
    []
  );

  if (!toasts.length) return null;
  return (
    <div
      className="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col gap-2"
      aria-live="polite"
      aria-atomic="false"
    >
      {toasts.map((t) => {
        const tone = TONE[t.type] || TONE.info;
        const Icon = tone.Icon;
        return (
          <div
            key={t.id}
            role="status"
            className="toast-in pointer-events-auto flex min-w-[15rem] max-w-sm items-center gap-2.5 rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-ink shadow-raised"
          >
            {Icon && <Icon size={16} className={`shrink-0 ${tone.cls}`} />}
            <span className="flex-1">{t.message}</span>
            {t.action && (
              <button
                onClick={() => {
                  t.action.onClick();
                  dismiss(t.id);
                }}
                className="shrink-0 rounded-md px-2 py-0.5 text-xs font-semibold text-accent transition hover:bg-accent-weak"
              >
                {t.action.label}
              </button>
            )}
            <button
              onClick={() => dismiss(t.id)}
              className="shrink-0 text-faint transition hover:text-ink"
              aria-label="Dismiss"
            >
              <XClose size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
