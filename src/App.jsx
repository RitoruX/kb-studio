import { useCallback, useEffect, useRef, useState } from 'react';
import { DndContext, DragOverlay, MouseSensor, TouchSensor, useSensor, useSensors, closestCorners } from '@dnd-kit/core';
import * as api from './api';
import { DEFAULT_CONFIG, dueBucket, weekRange, isoWeekLabel } from './constants';
import { weeklyTasks, formatWeekly } from './weekly';
import { ConfigContext } from './ConfigContext';
import Column from './components/Column';
import Card from './components/Card';
import TaskModal from './components/TaskModal';
import CaptureBar from './components/CaptureBar';
import SearchBox from './components/SearchBox';
import InboxDrawer from './components/InboxDrawer';
import WeekView from './components/WeekView';
import HeadsUp from './components/HeadsUp';
import SettingsModal from './components/SettingsModal';
import BoardSkeleton from './components/BoardSkeleton';
import ThemeToggle from './components/ThemeToggle';
import { ClipboardCheck, Inbox01, Bell01, BellOff01, Settings01, XClose } from '@untitledui/icons';
import Toaster from './components/Toaster';
import HelpModal from './components/HelpModal';
import { toast } from './toast';

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
  const [helpOpen, setHelpOpen] = useState(false);
  const [weeklyDue, setWeeklyDue] = useState(null); // null | 'Friday' | 'Saturday'
  const [view, setView] = useState('board'); // 'board' | 'week'
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
      toast(`Moved to ${newStatus}`);
    } catch {
      toast("Couldn't move — restored", { type: 'error' });
      refresh();
    }
  }

  async function handleSave(form) {
    try {
      if (editing?.promoteRaw) {
        const created = await api.promoteInbox({ raw: editing.promoteRaw, ...form });
        setTasks((prev) => [...prev, created]);
        loadInbox();
        toast('Added to board');
      } else if (editing?.isNew) {
        const created = await api.createTask(form);
        setTasks((prev) => [...prev, created]);
        toast('Task created');
      } else {
        const updated = await api.updateTask({ id: editing.id, ...form });
        setTasks((prev) => prev.map((t) => (t.id === editing.id ? updated : t)));
        toast('Saved');
      }
      setEditing(null); // closes the modal only on success — errors keep your edits
    } catch (e) {
      toast(`Couldn't save — ${e.message || e}`, { type: 'error' });
    }
  }

  async function handleCapture(text, details) {
    await api.captureInbox(text, details);
    loadInbox();
  }

  async function handleRemoveInbox(item) {
    await api.deleteInbox(item.raw);
    loadInbox();
    toast('Removed from inbox', { type: 'info' });
  }

  async function handleEditInbox(item, text, details) {
    await api.updateInbox(item.raw, text, details);
    loadInbox();
  }

  async function handleFileNote(item, project = '') {
    const body = (item.details || []).map((d) => `- ${d}`).join('\n');
    const r = await api.fileInboxNote({ raw: item.raw, title: item.text, body, project });
    loadInbox();
    toast(`Filed to ${r.file}`);
  }

  async function handlePatch(id, patch) {
    const updated = await api.updateTask({ id, ...patch });
    setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
  }

  const toggleBlocked = (task) => handlePatch(task.id, { blocked: !task.blocked });

  async function saveSettings(partial) {
    try {
      const next = await api.updateConfig(partial);
      setConfig(next);
      setSettingsOpen(false);
      refresh(); // task discovery / grouping may have changed
      toast('Settings saved');
    } catch (e) {
      toast(`Couldn't save settings — ${e.message || e}`, { type: 'error' });
    }
  }

  // one-click save of the current week's summary (from the Fri/Sat reminder banner)
  async function saveWeeklyNow() {
    const { start, end } = weekRange();
    const text = formatWeekly(weeklyTasks(tasks, config, start, end, true), {
      author: config.weeklyAuthor,
      start,
      end,
      noGroupLabel: config.noGroupLabel,
      config,
      endOfWeek: [5, 6].includes(new Date().getDay()),
    });
    try {
      const r = await api.saveWeekly(isoWeekLabel(), text);
      toast(r.existed ? 'Weekly summary already saved' : `Saved ${r.file}`);
      setWeeklyDue(null);
    } catch (e) {
      toast(`Couldn't save summary — ${e.message || e}`, { type: 'error' });
    }
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
    const task = tasks.find((t) => t.id === id);
    await api.deleteTask(id);
    setTasks((prev) => prev.filter((t) => t.id !== id));
    setEditing(null);
    toast('Task deleted', {
      type: 'info',
      duration: 7000, // give Undo a beat longer
      action: task && {
        label: 'Undo',
        onClick: async () => {
          // recreate the note from the captured task (new file, same content)
          const restored = await api.createTask({
            title: task.title,
            description: task.description,
            status: task.status,
            due: task.due,
            project: task.project,
            blocked: task.blocked,
            blockReason: task.blockReason,
          });
          setTasks((prev) => [...prev, restored]);
          toast('Task restored');
        },
      },
    });
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
      if (typing || editing || settingsOpen || helpOpen || e.metaKey || e.ctrlKey || e.altKey) return;
      // match the physical key (e.code), not the produced character — so shortcuts
      // still work in a Thai (or any non-Latin) keyboard layout.
      if (e.code === 'KeyC') {
        e.preventDefault();
        document.getElementById('capture-input')?.focus();
      } else if (e.code === 'Slash' && !e.shiftKey) {
        e.preventDefault();
        document.getElementById('search-input')?.focus();
      } else if (e.code === 'KeyN') {
        e.preventDefault();
        setEditing({ isNew: true, status: statusNames[0], project: defaultProject(), title: '', description: '', due: '' });
      } else if (e.code === 'KeyT') {
        e.preventDefault();
        setView((v) => (v === 'week' ? 'board' : 'week'));
      } else if (e.code === 'Slash' && e.shiftKey) {
        e.preventDefault();
        setHelpOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // intentional: re-bind only on these; the handler reads fresh state via closures
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing, settingsOpen, helpOpen, filter, statusNames.join()]);

  // one summary notification per app load if anything needs attention
  useEffect(() => {
    if (notify !== 'granted' || notifiedRef.current || loading) return;
    notifiedRef.current = true;
    if (overdueCount || todayCount) {
      new Notification('KB Studio — today', { body: `${overdueCount} overdue · ${todayCount} due today` });
    }
  }, [notify, loading, overdueCount, todayCount]);

  // Fri/Sat: nudge to save the weekly summary if it isn't saved yet
  useEffect(() => {
    if (loading) return;
    const day = new Date().getDay(); // 5 = Fri, 6 = Sat
    if (day !== 5 && day !== 6) return;
    let cancelled = false;
    api
      .getWeeklyStatus(isoWeekLabel())
      .then((r) => !cancelled && !r.exists && setWeeklyDue(day === 5 ? 'Friday' : 'Saturday'))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [loading]);

  return (
    <ConfigContext.Provider value={config}>
      <div className="flex h-dvh overflow-hidden bg-canvas text-ink">

        {/* ── Sidebar ─────────────────────────────────────────────── */}
        <aside className="flex w-64 shrink-0 flex-col border-r border-outline-variant bg-surface-container-low wood-texture">
          {/* Logo */}
          <div className="border-b border-outline-variant px-4 py-6">
            <div className="flex items-center gap-3 px-1 transition-transform duration-300 hover:translate-x-0.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-container text-on-primary-container">
                <ClipboardCheck size={18} />
              </div>
              <div>
                <h1 className="text-sm font-bold text-primary">KB Studio</h1>
                <p className="text-xs text-on-surface-variant">
                  {filter !== 'All' && filter !== noGroupLabel ? filter : 'Creative Strategy'}
                </p>
              </div>
            </div>
          </div>

          {/* Project nav */}
          <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-2">
            {tabs.map((p) => (
              <button
                key={p}
                onClick={() => setFilter(p)}
                className={[
                  'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-all duration-300',
                  filter === p
                    ? 'bg-primary-container font-bold text-on-primary-container'
                    : 'text-on-surface-variant hover:bg-surface-container-high hover:text-primary',
                ].join(' ')}
              >
                {p === 'All' ? 'Tasks' : p}
              </button>
            ))}
          </nav>

          {/* Bottom actions */}
          <div className="space-y-0.5 border-t border-outline-variant p-2">
            <ThemeToggle />
            <button
              onClick={() => setSettingsOpen(true)}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-on-surface-variant transition-all duration-300 hover:bg-surface-container-high hover:text-primary"
            >
              <Settings01 size={15} /> Settings
            </button>
            <button
              onClick={() => setHelpOpen(true)}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-on-surface-variant transition-all duration-300 hover:bg-surface-container-high hover:text-primary"
            >
              <span className="text-xs font-medium">?</span> Shortcuts
            </button>
          </div>
        </aside>

        {/* ── Main column ─────────────────────────────────────────── */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <header className="sticky top-0 z-10 shrink-0 border-b border-outline-variant bg-surface/80 backdrop-blur-sm transition-colors duration-300">
            <div className="flex items-center justify-between px-10 py-4">
              {/* Underline-style view tabs */}
              <div className="flex items-center gap-6">
                {[
                  ['board', 'Board'],
                  ['week', 'Weekly'],
                ].map(([v, lbl]) => (
                  <button
                    key={v}
                    onClick={() => setView(v)}
                    className={[
                      'pb-1 text-sm font-semibold transition-all duration-300',
                      view === v
                        ? 'border-b-2 border-primary text-primary'
                        : 'text-on-surface-variant opacity-80 hover:text-primary hover:opacity-100',
                    ].join(' ')}
                  >
                    {lbl}
                  </button>
                ))}
                <button
                  onClick={() => setInboxOpen(true)}
                  className="flex items-center gap-1 pb-1 text-sm font-semibold text-on-surface-variant opacity-80 transition-all duration-300 hover:text-primary hover:opacity-100"
                >
                  <Inbox01 size={15} /> Inbox
                  {inbox.length > 0 && (
                    <span className="ml-1 rounded-full bg-clay px-1.5 text-[11px] font-semibold tabular-nums text-clay-fg">
                      {inbox.length}
                    </span>
                  )}
                </button>
              </div>

              {/* Search + Bell */}
              <div className="flex flex-1 items-center justify-end gap-4">
                <SearchBox />
                {notify !== 'unsupported' && (
                  <button
                    onClick={enableNotify}
                    title={notify === 'granted' ? 'Due-today reminders on' : 'Enable due-today reminders'}
                    className="rounded-full p-2 text-on-surface-variant transition-all duration-300 hover:bg-surface-container-high hover:text-primary"
                  >
                    {notify === 'granted' ? <Bell01 size={18} /> : <BellOff01 size={18} />}
                  </button>
                )}
              </div>
            </div>

            {/* Capture bar */}
            <div className="border-t border-outline-variant px-10 py-2">
              <CaptureBar onCapture={handleCapture} />
            </div>
          </header>

          <main className="flex-1 overflow-y-auto p-4">
            {error && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
                Can't reach the API: {error}. Is the server running (<code>npm run dev</code>)?
              </div>
            )}

            {weeklyDue && (
              <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-line-strong bg-clay-weak px-4 py-2.5 text-sm">
                <span className="font-medium text-ink">
                  It's {weeklyDue} — you haven't saved this week's summary yet.
                </span>
                <button
                  onClick={saveWeeklyNow}
                  className="rounded-md bg-clay px-2.5 py-1 text-xs font-semibold text-clay-fg transition hover:bg-clay/90"
                >
                  Save now
                </button>
                <button
                  onClick={() => {
                    setView('week');
                    setWeeklyDue(null);
                  }}
                  className="rounded-md px-2 py-1 text-xs font-medium text-muted transition hover:text-ink"
                >
                  Open This Week
                </button>
                <button
                  onClick={() => setWeeklyDue(null)}
                  className="ml-auto rounded p-1 text-faint transition hover:text-ink"
                  title="Dismiss"
                >
                  <XClose size={15} />
                </button>
              </div>
            )}

            {!dismissedHeadsUp && (
              <HeadsUp
                overdue={overdueCount}
                today={todayCount}
                onView={() => setView('week')}
                onDismiss={() => setDismissedHeadsUp(true)}
              />
            )}

            {loading ? (
              <BoardSkeleton />
            ) : view === 'week' ? (
              <WeekView tasks={visible} onOpen={setEditing} onToggleBlocked={toggleBlocked} />
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
        </div>

        <InboxDrawer
          open={inboxOpen}
          items={inbox}
          projects={groups}
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

        {helpOpen && <HelpModal onClose={() => setHelpOpen(false)} />}

        <Toaster />
      </div>
    </ConfigContext.Provider>
  );
}
