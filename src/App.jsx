import { useCallback, useEffect, useRef, useState } from 'react';
import { DndContext, DragOverlay, MouseSensor, TouchSensor, useSensor, useSensors, closestCorners } from '@dnd-kit/core';
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
import BoardSkeleton from './components/BoardSkeleton';
import ThemeToggle from './components/ThemeToggle';

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

  // Mouse drags after an 8px move; touch needs a 200ms hold so a swipe still
  // scrolls the board instead of grabbing a card.
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } })
  );

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

  async function handleCapture(text, details) {
    await api.captureInbox(text, details);
    loadInbox();
  }

  async function handleRemoveInbox(item) {
    await api.deleteInbox(item.raw);
    loadInbox();
  }

  async function handleEditInbox(item, text, details) {
    await api.updateInbox(item.raw, text, details);
    loadInbox();
  }

  async function handleFileNote(item) {
    const body = (item.details || []).map((d) => `- ${d}`).join('\n');
    await api.fileInboxNote({ raw: item.raw, title: item.text, body });
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
      description: (item.details || []).map((d) => `- ${d}`).join('\n'),
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
      <div className="min-h-dvh bg-canvas text-ink">
        <header className="sticky top-0 z-10 border-b border-line bg-surface/80 backdrop-blur">
          <div className="flex flex-wrap items-center gap-3 px-3 py-3 sm:px-5">
            <h1 className="text-lg font-semibold tracking-tight">📋 KB Studio</h1>

            <div className="flex rounded-lg bg-panel p-0.5 text-sm">
              {[
                ['board', 'Board'],
                ['today', 'Today'],
              ].map(([v, lbl]) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={[
                    'rounded-md px-3 py-1 font-medium transition',
                    view === v ? 'bg-surface text-ink shadow-card' : 'text-muted hover:text-ink',
                  ].join(' ')}
                >
                  {lbl}
                </button>
              ))}
            </div>

            <button
              onClick={() => setInboxOpen(true)}
              className="flex items-center gap-1.5 rounded-full bg-panel px-3 py-1 text-sm text-muted transition hover:bg-line hover:text-ink"
            >
              📥 Inbox
              {inbox.length > 0 && (
                <span className="rounded-full bg-accent px-1.5 text-[11px] font-semibold tabular-nums text-accent-fg">
                  {inbox.length}
                </span>
              )}
            </button>

            {notify !== 'unsupported' && (
              <button
                onClick={enableNotify}
                title={notify === 'granted' ? 'Due-today reminders on' : 'Enable due-today reminders'}
                className="rounded-full bg-panel px-2.5 py-1 text-sm text-muted transition hover:bg-line hover:text-ink"
              >
                {notify === 'granted' ? '🔔' : '🔕'}
              </button>
            )}

            <ThemeToggle />

            <button
              onClick={() => setSettingsOpen(true)}
              title="Settings"
              className="rounded-full bg-panel px-2.5 py-1 text-sm text-muted transition hover:bg-line hover:text-ink"
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
                    filter === p
                      ? 'bg-accent text-accent-fg'
                      : 'bg-panel text-muted hover:bg-line hover:text-ink',
                  ].join(' ')}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 border-t border-line px-3 py-2 sm:px-5">
            <CaptureBar onCapture={handleCapture} />
            <SearchBox />
          </div>
        </header>

        <main className="p-3 sm:p-5">
          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
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
            <BoardSkeleton />
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
              <div className="flex gap-3 overflow-x-auto pb-4">
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
          onFileNote={handleFileNote}
          onEdit={handleEditInbox}
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
