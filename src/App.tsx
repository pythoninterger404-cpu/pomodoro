import { useEffect, useState } from 'react';
import { TimerSettings, TodoItem, StudySession } from './types';
import { Timer as TimerIcon, ListChecks, BarChart3, Settings as SettingsIcon, LogIn, LogOut } from 'lucide-react';
import { LocalStorage } from './lib/storage';
import {
  isFirebaseEnabled,
  loginWithGoogle,
  logoutUser,
  FirebaseSync,
  User,
  onAuthStateChanged,
} from './lib/firebase';
import { Timer } from './components/Timer';
import { Todos } from './components/Todos';
import { Stats } from './components/Stats';
import { Settings } from './components/Settings';
import { playBtnSound } from './lib/audio';

type Tab = 'timer' | 'todos' | 'stats' | 'settings';

const TABS: Array<{ id: Tab; label: string; icon: typeof TimerIcon }> = [
  { id: 'timer', label: 'Timer', icon: TimerIcon },
  { id: 'todos', label: 'Tugas', icon: ListChecks },
  { id: 'stats', label: 'Statistik', icon: BarChart3 },
  { id: 'settings', label: 'Pengaturan', icon: SettingsIcon },
];

export default function App() {
  const [tab, setTab] = useState<Tab>('timer');
  const [settings, setSettings] = useState<TimerSettings>(LocalStorage.getSettings());
  const [todos, setTodos] = useState<TodoItem[]>(LocalStorage.getTodos());
  const [sessions, setSessions] = useState<StudySession[]>(LocalStorage.getSessions());

  const [user, setUser] = useState<User | null>(null);

  const [secondsRemaining, setSecondsRemaining] = useState(25 * 60);
  const [timerMode, setTimerMode] = useState<'focus' | 'shortBreak' | 'longBreak'>('focus');
  const [isActive, setIsActive] = useState(false);
  const [activeTodoId, setActiveTodoId] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Auth listener & cloud sync
  useEffect(() => {
    if (!isFirebaseEnabled) return;

    const unsubscribe = onAuthStateChanged(async (currentUser: User | null) => {
      setUser(currentUser);
      if (currentUser) {
        const cloudSettings = await FirebaseSync.loadSettings(currentUser.id);
        setSettings(cloudSettings);
        const syncedItems = await FirebaseSync.syncTodos(currentUser.id, LocalStorage.getTodos());
        setTodos(syncedItems);
        const syncedSessions = await FirebaseSync.loadStudySessions(currentUser.id);
        setSessions(syncedSessions);
      } else {
        setSettings(LocalStorage.getSettings());
        setTodos(LocalStorage.getTodos());
        setSessions(LocalStorage.getSessions());
      }
    });

    return () => unsubscribe();
  }, []);

  const saveSettings = async (newSettings: TimerSettings) => {
    setSettings(newSettings);
    if (user) {
      await FirebaseSync.saveSettings(user.id, newSettings);
    } else {
      LocalStorage.saveSettings(newSettings);
    }
  };

  const persistTodos = async (updated: TodoItem[]) => {
    setTodos(updated);
    if (user) {
      await FirebaseSync.syncTodos(user.id, updated);
    } else {
      LocalStorage.saveTodos(updated);
    }
  };

  const handleAddTodo = (text: string, estimated: number) => {
    const newTodo: TodoItem = {
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9),
      text,
      completed: false,
      pomodorosEstimated: estimated,
      pomodorosCompleted: 0,
      createdAt: Date.now(),
    };
    void persistTodos([newTodo, ...todos]);
  };

  const handleToggleTodo = (id: string) => {
    const updated = todos.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t));
    void persistTodos(updated);
    if (activeTodoId === id) setActiveTodoId(null);
  };

  const handleDeleteTodo = (id: string) => {
    void persistTodos(todos.filter((t) => t.id !== id));
    if (activeTodoId === id) setActiveTodoId(null);
  };

  const handleSessionComplete = async (type: 'focus' | 'shortBreak' | 'longBreak', duration: number) => {
    let completedTaskId: string | undefined;
    let completedTaskTitle: string | undefined;

    if (type === 'focus' && activeTodoId) {
      const activeTask = todos.find((t) => t.id === activeTodoId);
      if (activeTask) {
        completedTaskId = activeTask.id;
        completedTaskTitle = activeTask.text;
        const updated = todos.map((t) =>
          t.id === activeTodoId ? { ...t, pomodorosCompleted: t.pomodorosCompleted + 1 } : t
        );
        void persistTodos(updated);
      }
    }

    const sessionPayload = {
      type,
      duration,
      timestamp: Date.now(),
      taskId: completedTaskId,
      taskTitle: completedTaskTitle,
    };

    if (user) {
      const saved = await FirebaseSync.addStudySession(user.id, sessionPayload);
      setSessions((prev) => [saved, ...prev]);
    } else {
      const saved = LocalStorage.addSession(sessionPayload);
      setSessions((prev) => [saved, ...prev]);
    }
  };

  const handleLogin = async () => {
    playBtnSound();
    try {
      await loginWithGoogle();
    } catch {
      alert('Autentikasi Google gagal atau dibatalkan. Pastikan redirect URL sudah terdaftar di Supabase Auth.');
    }
  };

  const handleLogout = async () => {
    playBtnSound();
    if (confirm('Keluar dari akun Anda?')) {
      await logoutUser();
      setUser(null);
    }
  };

  const activeTask = todos.find((t) => t.id === activeTodoId);
  const pomodorosCompleted = sessions.filter((s) => s.type === 'focus').length;

  return (
    <div className="w-full h-screen flex items-center justify-center p-3 sm:p-6">
      {/* Widget panel — compact, ~1/3 desktop width */}
      <div className="surface rounded-2xl w-full max-w-[400px] h-[640px] max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between px-4 pt-3.5 pb-2 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#d9a441]" />
            <h1 className="text-sm font-semibold tracking-tight text-[#e3e5ea]">Focus Popup</h1>
          </div>
          {isFirebaseEnabled &&
            (user ? (
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 text-[11px] text-dim hover:text-[#c8ccd6] transition-colors"
                title={user.email || 'Keluar'}
              >
                <span className="max-w-[110px] truncate">{user.email || 'Akun'}</span>
                <LogOut size={13} />
              </button>
            ) : (
              <button
                onClick={handleLogin}
                className="flex items-center gap-1.5 text-[11px] text-dim hover:text-[#c8ccd6] transition-colors"
              >
                <LogIn size={13} />
                <span>Masuk</span>
              </button>
            ))}
        </header>

        {/* Tab navigation */}
        <nav className="flex gap-1 px-3 pb-2 shrink-0">
          {TABS.map((t) => {
            const Icon = t.icon;
            const selected = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => {
                  playBtnSound();
                  setTab(t.id);
                }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-medium transition-all ${
                  selected
                    ? 'bg-[#2b3038] text-[#e3e5ea]'
                    : 'text-faint hover:text-dim hover:bg-white/[0.03]'
                }`}
              >
                <Icon size={14} />
                <span className="hidden min-[340px]:inline">{t.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Content */}
        <main className="flex-1 min-h-0 border-t border-white/5">
          {tab === 'timer' && (
            <Timer
              settings={settings}
              activeTodoText={activeTask ? activeTask.text : null}
              onSessionComplete={handleSessionComplete}
              secondsRemaining={secondsRemaining}
              setSecondsRemaining={setSecondsRemaining}
              timerMode={timerMode}
              setTimerMode={setTimerMode}
              isActive={isActive}
              setIsActive={setIsActive}
              pomodorosCompleted={pomodorosCompleted}
              soundEnabled={soundEnabled}
              setSoundEnabled={setSoundEnabled}
            />
          )}
          {tab === 'todos' && (
            <Todos
              todos={todos}
              onAddTodo={handleAddTodo}
              onToggleTodo={handleToggleTodo}
              onDeleteTodo={handleDeleteTodo}
              activeTodoId={activeTodoId}
              onSetActiveTodo={setActiveTodoId}
            />
          )}
          {tab === 'stats' && <Stats sessions={sessions} />}
          {tab === 'settings' && <Settings settings={settings} onSave={saveSettings} />}
        </main>
      </div>
    </div>
  );
}
