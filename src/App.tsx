import { useEffect, useState } from 'react';
import { TimerSettings, ThemeColor, TodoItem, StudySession } from './types';
import { Timer as TimerIcon, ListChecks, BarChart3, Settings as SettingsIcon, LogIn, LogOut, Download } from 'lucide-react';
import { LocalStorage } from './lib/storage';
import { getTodayFocusCount } from './lib/target';
import { getCurrentStreak } from './lib/streak';
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
  const [timerMode, setTimerMode] = useState<'focus' | 'shortBreak' | 'longBreak' | 'custom'>('focus');
  const [isActive, setIsActive] = useState(false);
  const [activeTodoId, setActiveTodoId] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // PWA
  const [, setInstallPrompt] = useState<{ prompt: () => Promise<void> } | null>(null);
  const [installable, setInstallable] = useState(false);
  useEffect(() => {
    const h = (e: Event) => { e.preventDefault(); setInstallPrompt(e as unknown as { prompt: () => Promise<void> }); setInstallable(true); };
    window.addEventListener('beforeinstallprompt', h);
    window.addEventListener('appinstalled', () => setInstallable(false));
    if (window.matchMedia('(display-mode: standalone)').matches) setInstallable(false);
    return () => window.removeEventListener('beforeinstallprompt', h);
  }, []);
  useEffect(() => {
    const h = (e: Event) => { (window as unknown as Record<string,unknown>)._installPrompt = e; };
    window.addEventListener('beforeinstallprompt', h);
    return () => window.removeEventListener('beforeinstallprompt', h);
  }, []);

  const themeColor: ThemeColor = settings.themeColor || 'amber';

  useEffect(() => {
    if (!isFirebaseEnabled) return;
    const unsub = onAuthStateChanged(async (u: User | null) => {
      setUser(u);
      if (u) { setSettings(await FirebaseSync.loadSettings(u.id)); setTodos(await FirebaseSync.syncTodos(u.id, LocalStorage.getTodos())); setSessions(await FirebaseSync.loadStudySessions(u.id)); }
      else { setSettings(LocalStorage.getSettings()); setTodos(LocalStorage.getTodos()); setSessions(LocalStorage.getSessions()); }
    });
    return () => unsub();
  }, []);

  const saveSettings = async (s: TimerSettings) => { setSettings(s); user ? await FirebaseSync.saveSettings(user.id, s) : LocalStorage.saveSettings(s); };
  const persistTodos = async (ts: TodoItem[]) => { setTodos(ts); user ? await FirebaseSync.syncTodos(user.id, ts) : LocalStorage.saveTodos(ts); };
  const handleAddTodo = (text: string, est: number, tag?: string) => { void persistTodos([{id:crypto.randomUUID?.()??Math.random().toString(36).substring(2,9),text,completed:false,pomodorosEstimated:est,pomodorosCompleted:0,createdAt:Date.now(),tag:tag||'Lainnya'},...todos]); };
  const handleToggleTodo = (id: string) => { const up = todos.map(t=>t.id===id?{...t,completed:!t.completed}:t); void persistTodos(up); if(activeTodoId===id)setActiveTodoId(null); };
  const handleDeleteTodo = (id: string) => { void persistTodos(todos.filter(t=>t.id!==id)); if(activeTodoId===id)setActiveTodoId(null); };
  const handleSessionComplete = async (type:'focus'|'shortBreak'|'longBreak'|'custom',duration:number) => {
    let cid:string|undefined,ctitle:string|undefined;
    if(type==='focus'&&activeTodoId){const at=todos.find(t=>t.id===activeTodoId);if(at){cid=at.id;ctitle=at.text;void persistTodos(todos.map(t=>t.id===activeTodoId?{...t,pomodorosCompleted:t.pomodorosCompleted+1}:t));}}
    const payload={type,duration,timestamp:Date.now(),taskId:cid,taskTitle:ctitle};
    if(user){const sv=await FirebaseSync.addStudySession(user.id,payload);setSessions(p=>[sv,...p]);}else{const sv=LocalStorage.addSession(payload);setSessions(p=>[sv,...p]);}
  };

  const activeTask = todos.find(t=>t.id===activeTodoId);
  const pomodorosCompleted = sessions.filter(s=>s.type==='focus').length;
  const todayFocus = getTodayFocusCount(sessions);
  const currentStreak = getCurrentStreak(sessions);

  return (
    <div className="w-full min-h-screen md:h-screen flex items-center justify-center safe-top safe-bottom" data-theme={themeColor} style={{minHeight:'100dvh'}}>
      <div className="surface md:rounded-2xl w-full md:max-w-[400px] h-full md:h-[640px] md:max-h-[92vh] flex flex-col overflow-hidden">

        <header className="flex items-center justify-between px-4 pt-3.5 pb-2 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{background:'var(--accent,#d9a441)'}}/>
            <h1 className="text-sm font-semibold tracking-tight text-[#e3e5ea]">Focus Popup</h1>
            {installable && (
              <button onClick={()=>{const ev=(window as any)._installPrompt;if(ev)ev.prompt();setInstallable(false);}}
                className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full surface-soft text-dim hover:text-[#c8ccd6] transition-colors">
                <Download size={11}/><span className="hidden min-[380px]:inline">Install</span>
              </button>
            )}
          </div>
          {isFirebaseEnabled && (user ? (
            <button onClick={()=>{if(confirm('Keluar?')){logoutUser();setUser(null);}}} className="flex items-center gap-1.5 text-[11px] text-dim hover:text-[#c8ccd6] transition-colors">
              <span className="max-w-[110px] truncate">{user.email||'Akun'}</span><LogOut size={13}/>
            </button>
          ) : (
            <button onClick={()=>setShowAuthModal(true)} className="flex items-center gap-1.5 text-[11px] text-dim hover:text-[#c8ccd6] transition-colors">
              <LogIn size={13}/><span>Masuk</span>
            </button>
          ))}
        </header>

        <nav className="flex gap-1 px-3 pb-2 shrink-0">
          {TABS.map(t=>{const Icon=t.icon;const sel=tab===t.id;return(
            <button key={t.id} onClick={()=>setTab(t.id)} className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-[12px] font-medium transition-all ${sel?'bg-[#2b3038] text-[#e3e5ea]':'text-faint hover:text-dim hover:bg-white/[0.03]'}`}>
              <Icon size={16}/><span>{t.label}</span>
            </button>
          );})}
        </nav>

        <main className="flex-1 min-h-0 border-t border-white/5">
          {tab==='timer'&&<Timer settings={settings} activeTodoText={activeTask?activeTask.text:null} onSessionComplete={handleSessionComplete} secondsRemaining={secondsRemaining} setSecondsRemaining={setSecondsRemaining} timerMode={timerMode} setTimerMode={setTimerMode} isActive={isActive} setIsActive={setIsActive} pomodorosCompleted={pomodorosCompleted} soundEnabled={soundEnabled} setSoundEnabled={setSoundEnabled} todayFocusCount={todayFocus} streak={currentStreak}/>}
          {tab==='todos'&&<Todos todos={todos} onAddTodo={handleAddTodo} onToggleTodo={handleToggleTodo} onDeleteTodo={handleDeleteTodo} activeTodoId={activeTodoId} onSetActiveTodo={setActiveTodoId}/>}
          {tab==='stats'&&<Stats sessions={sessions} themeColor={themeColor} dailyTarget={settings.dailyTarget} todos={todos}/>}
          {tab==='settings'&&<Settings settings={settings} onSave={saveSettings}/>}
        </main>
      </div>
      {showAuthModal && <AuthModal onClose={()=>setShowAuthModal(false)}/>}
    </div>
  );
}
