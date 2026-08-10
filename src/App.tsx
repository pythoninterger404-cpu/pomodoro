import { useEffect, useState } from 'react';
import { TimerSettings, ThemeColor, TodoItem, StudySession } from './types';
import { Timer as TimerIcon, ListChecks, BarChart3, Settings as SettingsIcon, LogIn, LogOut } from 'lucide-react';
import { LocalStorage } from './lib/storage';
import { isFirebaseEnabled, logoutUser, FirebaseSync, User, onAuthStateChanged } from './lib/firebase';
import { Timer } from './components/Timer';
import { Todos } from './components/Todos';
import { Stats } from './components/Stats';
import { Settings } from './components/Settings';
import { AuthModal } from './components/AuthModal';

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
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(settings.focusTime * 60);
  const [timerMode, setTimerMode] = useState<'focus' | 'shortBreak' | 'longBreak'>('focus');
  const [isActive, setIsActive] = useState(false);
  const [activeTodoId, setActiveTodoId] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const themeColor: ThemeColor = settings.themeColor || 'amber';

  useEffect(() => {
    if (!isFirebaseEnabled) return;
    const unsub = onAuthStateChanged(async (currentUser: User | null) => {
      setUser(currentUser);
      if (currentUser) {
        const cs = await FirebaseSync.loadSettings(currentUser.id); setSettings(cs);
        const si = await FirebaseSync.syncTodos(currentUser.id, LocalStorage.getTodos()); setTodos(si);
        const ss = await FirebaseSync.loadStudySessions(currentUser.id); setSessions(ss);
      } else {
        setSettings(LocalStorage.getSettings()); setTodos(LocalStorage.getTodos()); setSessions(LocalStorage.getSessions());
      }
    });
    return () => unsub();
  }, []);

  const saveSettings = async (s: TimerSettings) => { setSettings(s); if (user) await FirebaseSync.saveSettings(user.id, s); else LocalStorage.saveSettings(s); };
  const persistTodos = async (ts: TodoItem[]) => { setTodos(ts); if (user) await FirebaseSync.syncTodos(user.id, ts); else LocalStorage.saveTodos(ts); };

  const handleAddTodo = (text: string, est: number) => {
    const t: TodoItem = { id: crypto.randomUUID?.() ?? Math.random().toString(36).substring(2,9), text, completed:false, pomodorosEstimated:est, pomodorosCompleted:0, createdAt:Date.now() };
    void persistTodos([t, ...todos]);
  };
  const handleToggleTodo = (id: string) => { const up = todos.map(t => t.id===id ? {...t, completed:!t.completed} : t); void persistTodos(up); if (activeTodoId===id) setActiveTodoId(null); };
  const handleDeleteTodo = (id: string) => { void persistTodos(todos.filter(t => t.id!==id)); if (activeTodoId===id) setActiveTodoId(null); };

  const handleSessionComplete = async (type: 'focus'|'shortBreak'|'longBreak', duration: number) => {
    let cid: string|undefined, ctitle: string|undefined;
    if (type==='focus' && activeTodoId) { const at = todos.find(t=>t.id===activeTodoId); if(at){cid=at.id;ctitle=at.text; void persistTodos(todos.map(t=>t.id===activeTodoId?{...t,pomodorosCompleted:t.pomodorosCompleted+1}:t));} }
    const payload = {type,duration,timestamp:Date.now(),taskId:cid,taskTitle:ctitle};
    if(user){const sv=await FirebaseSync.addStudySession(user.id,payload);setSessions(p=>[sv,...p]);}else{const sv=LocalStorage.addSession(payload);setSessions(p=>[sv,...p]);}
  };

  const handleLogin = () => setShowAuthModal(true);
  const handleLogout = async () => { if (confirm('Keluar dari akun Anda?')) { await logoutUser(); setUser(null); } };

  const activeTask = todos.find(t => t.id === activeTodoId);
  const pomodorosCompleted = sessions.filter(s => s.type==='focus').length;

  return (
    <div className="w-full h-screen flex items-center justify-center p-3 sm:p-6" data-theme={themeColor}>
      <div className="surface rounded-2xl w-full max-w-[400px] h-[640px] max-h-[92vh] flex flex-col overflow-hidden">
        <header className="flex items-center justify-between px-4 pt-3.5 pb-2 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{background:'var(--accent,#d9a441)'}} />
            <h1 className="text-sm font-semibold tracking-tight text-[#e3e5ea]">Focus Popup</h1>
          </div>
          {isFirebaseEnabled &&
            (user ? (
              <button onClick={handleLogout} className="flex items-center gap-1.5 text-[11px] text-dim hover:text-[#c8ccd6] transition-colors" title={user.email || 'Keluar'}>
                <span className="max-w-[110px] truncate">{user.email || 'Akun'}</span><LogOut size={13} />
              </button>
            ) : (
              <button onClick={handleLogin} className="flex items-center gap-1.5 text-[11px] text-dim hover:text-[#c8ccd6] transition-colors"><LogIn size={13} /><span>Masuk</span></button>
            ))}
        </header>

        <nav className="flex gap-1 px-3 pb-2 shrink-0">
          {TABS.map(t => { const Icon = t.icon; const sel = tab===t.id; return (
            <button key={t.id} onClick={() => setTab(t.id)} className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-medium transition-all ${sel ? 'bg-[#2b3038] text-[#e3e5ea]' : 'text-faint hover:text-dim hover:bg-white/[0.03]'}`}>
              <Icon size={14} /><span className="hidden min-[340px]:inline">{t.label}</span>
            </button>
          );})}
        </nav>

        <main className="flex-1 min-h-0 border-t border-white/5">
          {tab === 'timer' && <Timer settings={settings} activeTodoText={activeTask?activeTask.text:null} onSessionComplete={handleSessionComplete} secondsRemaining={secondsRemaining} setSecondsRemaining={setSecondsRemaining} timerMode={timerMode} setTimerMode={setTimerMode} isActive={isActive} setIsActive={setIsActive} pomodorosCompleted={pomodorosCompleted} soundEnabled={soundEnabled} setSoundEnabled={setSoundEnabled} />}
          {tab === 'todos' && <Todos todos={todos} onAddTodo={handleAddTodo} onToggleTodo={handleToggleTodo} onDeleteTodo={handleDeleteTodo} activeTodoId={activeTodoId} onSetActiveTodo={setActiveTodoId} />}
          {tab === 'stats' && <Stats sessions={sessions} themeColor={themeColor} />}
          {tab === 'settings' && <Settings settings={settings} onSave={saveSettings} />}
        </main>
      </div>

      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
    </div>
  );
}
