async function json(res) {
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || res.statusText);
  return res.json();
}

const send = (method, body) =>
  fetch('/api/tasks', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then(json);

const post = (url, body) =>
  fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(
    json
  );

export const getConfig = () => fetch('/api/config').then(json);
export const updateConfig = (partial) =>
  fetch('/api/config', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(partial),
  }).then(json);
export const getProjects = () => fetch('/api/projects').then(json);
export const getTasks = () => fetch('/api/tasks').then(json);
export const createTask = (task) => send('POST', task);
export const updateTask = (patch) => send('PATCH', patch);
export const deleteTask = (id) =>
  fetch('/api/tasks?id=' + encodeURIComponent(id), { method: 'DELETE' }).then(json);

export const getInbox = () => fetch('/api/inbox').then(json);
export const captureInbox = (text) => post('/api/inbox', { text });
export const promoteInbox = (payload) => post('/api/inbox/promote', payload);
export const deleteInbox = (raw) =>
  fetch('/api/inbox?raw=' + encodeURIComponent(raw), { method: 'DELETE' }).then(json);
export const searchVault = (q) => fetch('/api/search?q=' + encodeURIComponent(q)).then(json);
