import { useCallback, useEffect, useRef, useState } from 'react';
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors, closestCorners } from '@dnd-kit/core';
import * as api from './api';
import { DEFAULT_CONFIG, dueBucket } from './constants';
import { ConfigContext } from './ConfigContext';
import Column from './components/Column';
import Card from './components/Card';
import TaskModal from './components/TaskModal';
import CaptureBar from './components/CaptureBar';
import SearchBox from './components/SearchBox';
import InboxDrawer from './components/InboxDrawer';
import TodayView from './components/TodayView';
import HeadsUp from './components/HeadsUp';
import SettingsModal from './components/SettingsModal';

export default function App() {
  const [tasks, setTasks] = useState([]);
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [filter, setFilter] = useState('All');
  const [editing, setEditing] = useState(null);
  const [activeId, setActiveId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [inbox, setInbox] = useState([]);
  const [inboxOpen, setInboxOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [view, setView] = useState('board'); // 'board' | 'today'
  const [dismissedHeadsUp, setDismissedHeadsUp] = useState(false);
  const [notify, setNotify] = useState(typeof Notification !== 'undefined' ? Notification.permission : 'unsupported');
  const notifiedRef = useRef(false);

  const refresh = useCallback(async () => {
    try {
      const [t, c] = await Promise.all([api.getTasks(), api.getConfig()]);
      setTasks(t);
      setConfig(c);
      setError(null);
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadInbox = useCallback(async () => {
    try {
      setInbox(await api.getInbox());
    } catch {
      /* non-fatal */
    }
  }, []);

  useEffect(() => {
    refresh();
    loadInbox();
  }, [refresh, loadInbox]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  // statuses/groups are derived from config + the live task set
  const statusNames = config.statuses.map((s) => s.name);
  const extraStatuses = [...new Set(tasks.map((t) => t.status))].filter((s) => s && !statusNames.includes(s));
  const boardStatuses = [...statusNames, ...extraStatuses]; // never drop a task with an unknown status
  const groups = [...new Set(tasks.map((t) => t.project).filter(Boolean))].sort();
  const hasNoProject = tasks.some((t) => !t.project);
  const noGroupLabel = config.noGroupLabel;

  const visible =
    filter === 'All'
      ? tasks
      : filter === noGroupLabel
        ? tasks.filter((t) => !t.project)
        : tasks.filter((t) => t.project === filter);

  async function onDragEnd(e) {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;
    const newStatus = over.id;
    const task = tasks.find((t) => t.id === active.id);
    if (!task || !boardStatuses.includes(newStatus) || task.status === newStatus) return;

    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: newStatus } : t)));
    try {
      const updated = await api.updateTask({ id: task.id, status: newStatus });
      setTasks((prev) => prev.map((t) => (t.id === task.id ? updated : t)));
    } catch {
      refresh();
    }
  }

  async function handleSave(form) {
    if (editing?.promoteRaw) {
      const created = await api.promoteInbox({ raw: editing.promoteRaw, ...form });
      setTasks((prev) => [...prev, created]);
      loadInbox();
    } else if (editing?.isNew) {
      const created = await api.createTask(form);
      setTasks((prev) => [...prev, created]);
    } else {
      const updated = await api.updateTask({ id: editing.id, ...form });
      setTasks((prev) => prev.map((t) => (t.id === editing.id ? updated : t)));
    }
    setEditing(null);
  }

  async function handleCapture(text) {
    await api.captureInbox(text);
    loadInbox();
  }

  async function handleRemoveInbox(item) {
    await api.deleteInbox(item.raw);
    loadInbox();
  }

  async function handlePatch(id, patch) {
    const updated = await api.updateTask({ id, ...patch });
    setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
  }

  async function saveSettings(partial) {
    const next = await api.updateConfig(partial);
    setConfig(next);
    setSettingsOpen(false);
    refresh(); // task discovery / grouping may have changed
  }

  async function enableNotify() {
    if (typeof Notification === 'undefined') return;
    setNotify(await Notification.requestPermission());
  }

  // default group: the current project tab if you're inside one, else none
  const defaultProject = () => (filter !== 'All' && filter !== noGroupLabel ? filter : '');

  function startPromote(item) {
    setInboxOpen(false);
    setEditing({
      isNew: true,
      promoteRaw: item.raw,
      title: item.text,
      description: '',
      due: '',
      status: statusNames[0],
      project: defaultProject(),
    });
  }

  async function handleDelete(id) {
    await api.deleteTask(id);
    setTasks((prev) => prev.filter((t) => t.id !== id));
    setEditing(null);
  }

  async function quickCreate(status, title) {
    const created = await api.createTask({ title, status, project: defaultProject() });
    setTasks((prev) => [...prev, created]);
  }

  const activeTask = tasks.find((t) => t.id === activeId);
  const tabs = ['All', ...groups, ...(hasNoProject ? [noGroupLabel] : [])];

  const openTasks = tasks.filter((t) => t.status !== config.doneStatus);
  const overdueCount = openTasks.filter((t) => dueBucket(t.due) === 'overdue').length;
  const todayCount = openTasks.filter((t) => dueBucket(t.due) === 'today').length;

  // global shortcuts: c = capture, / = search, n = new task, t = toggle Today
  useEffect(() => {
    const onKey = (e) => {
      const el = e.target;
      const typing =
        el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable;
      if (typing || editing || settingsOpen || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'c') {
        e.preventDefault();
        document.getElementById('capture-input')?.focus();
      } else if (e.key === '/') {
        e.preventDefault();
        document.getElementById('search-input')?.focus();
      } else if (e.key === 'n') {
        e.preventDefault();
        setEditing({ isNew: true, status: statusNames[0], project: defaultProject(), title: '', description: '', due: '' });
      } else if (e.key === 't') {
        e.preventDefault();
        setView((v) => (v === 'today' ? 'board' : 'today'));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [editing, settingsOpen, filter, statusNames.join()]);

  // one summary notification per app load if anything needs attention
  useEffect(() => {
    if (notify !== 'granted' || notifiedRef.current || loading) return;
    notifiedRef.current = true;
    if (overdueCount || todayCount) {
      new Notification('KB Studio — today', { body: `${overdueCount} overdue · ${todayCount} due today` });
    }
  }, [notify, loading, overdueCount, todayCount]);

  return (
    <ConfigContext.Provider value={config}>
      <div className="min-h-screen bg-slate-50 text-slate-800">
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur">
          <div className="flex flex-wrap items-center gap-3 px-5 py-3">
            <h1 className="text-lg font-semibold">📋 KB Studio</h1>

            <div className="flex rounded-lg bg-slate-100 p-0.5 text-sm">
              {[
                ['board', 'Board'],
                ['today', 'Today'],
              ].map(([v, lbl]) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={[
                    'rounded-md px-3 py-1 font-medium transition',
                    view === v ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700',
                  ].join(' ')}
                >
                  {lbl}
                </button>
              ))}
            </div>

            <button
              onClick={() => setInboxOpen(true)}
              className="flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-600 hover:bg-slate-200"
            >
              📥 Inbox
              {inbox.length > 0 && (
                <span className="rounded-full bg-amber-500 px-1.5 text-[11px] font-semibold text-white">
                  {inbox.length}
                </span>
              )}
            </button>

            {notify !== 'unsupported' && (
              <button
                onClick={enableNotify}
                title={notify === 'granted' ? 'Due-today reminders on' : 'Enable due-today reminders'}
                className="rounded-full bg-slate-100 px-2.5 py-1 text-sm text-slate-600 hover:bg-slate-200"
              >
                {notify === 'granted' ? '🔔' : '🔕'}
              </button>
            )}

            <button
              onClick={() => setSettingsOpen(true)}
              title="Settings"
              className="rounded-full bg-slate-100 px-2.5 py-1 text-sm text-slate-600 hover:bg-slate-200"
            >
              ⚙
            </button>

            <div className="ml-auto flex flex-wrap gap-1.5">
              {tabs.map((p) => (
                <button
                  key={p}
                  onClick={() => setFilter(p)}
                  className={[
                    'rounded-full px-3 py-1 text-sm transition',
                    filter === p ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                  ].join(' ')}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 px-5 py-2">
            <CaptureBar onCapture={handleCapture} />
            <SearchBox />
          </div>
        </header>

        <main className="p-5">
          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              Can’t reach the API: {error}. Is the server running (<code>npm run dev</code>)?
            </div>
          )}

          {!dismissedHeadsUp && (
            <HeadsUp
              overdue={overdueCount}
              today={todayCount}
              onView={() => setView('today')}
              onDismiss={() => setDismissedHeadsUp(true)}
            />
          )}

          {loading ? (
            <p className="text-slate-400">Loading…</p>
          ) : view === 'today' ? (
            <TodayView tasks={visible} onOpen={setEditing} />
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCorners}
              onDragStart={(e) => setActiveId(e.active.id)}
              onDragEnd={onDragEnd}
              onDragCancel={() => setActiveId(null)}
            >
              <div className="flex gap-4 overflow-x-auto pb-4">
                {boardStatuses.map((s) => (
                  <Column
                    key={s}
                    status={s}
                    tasks={visible.filter((t) => t.status === s)}
                    onCreate={quickCreate}
                    onOpen={setEditing}
                    showProject={filter === 'All'}
                  />
                ))}
              </div>
              <DragOverlay>
                {activeTask ? <Card task={activeTask} overlay showProject={filter === 'All'} onOpen={() => {}} /> : null}
              </DragOverlay>
            </DndContext>
          )}
        </main>

        <InboxDrawer
          open={inboxOpen}
          items={inbox}
          onClose={() => setInboxOpen(false)}
          onPromote={startPromote}
          onRemove={handleRemoveInbox}
        />

        {editing && (
          <TaskModal
            task={editing}
            projects={groups}
            onSave={handleSave}
            onDelete={editing.isNew ? null : handleDelete}
            onClose={() => setEditing(null)}
            onPatch={editing.isNew ? null : (patch) => handlePatch(editing.id, patch)}
          />
        )}

        {settingsOpen && <SettingsModal config={config} onSave={saveSettings} onClose={() => setSettingsOpen(false)} />}
      </div>
    </ConfigContext.Provider>
  );
}
