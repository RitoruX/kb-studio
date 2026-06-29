// Minimal toast bus — call toast() from anywhere (no context drilling); the
// <Toaster/> mounted once in App subscribes and renders them.
let listeners = [];
let seq = 0;

// toast('Saved') | toast('Couldn’t save', { type: 'error' })
// optional action: toast('Task deleted', { action: { label: 'Undo', onClick } })
export function toast(message, opts = {}) {
  const t = {
    id: ++seq,
    message,
    type: opts.type || 'success', // 'success' | 'error' | 'info'
    action: opts.action || null,
    duration: opts.duration ?? 3500,
  };
  listeners.forEach((l) => l(t));
  return t.id;
}

export function subscribeToast(fn) {
  listeners.push(fn);
  return () => {
    listeners = listeners.filter((l) => l !== fn);
  };
}
