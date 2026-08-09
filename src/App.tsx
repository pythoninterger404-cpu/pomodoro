import { useEffect, useState } from 'react';
import { 
  AppWindowState, 
  TimerSettings, 
  TodoItem, 
  StudySession 
} from './types';
import { 
  Timer as TimerIcon, 
  CheckSquare, 
  Calendar as CalendarIcon, 
  BarChart4, 
  Settings as SettingsIcon,
  X,
  Minus,
  LogOut,
  User as UserIcon,
  LogIn,
  Monitor
} from 'lucide-react';
import { LocalStorage } from './lib/storage';
import { 
  isFirebaseEnabled, 
  loginWithGoogle, 
  logoutUser, 
  FirebaseSync 
} from './lib/firebase';
import { User, onAuthStateChanged } from './lib/firebase';

// Component Imports
import { Timer } from './components/Timer';
import { Todos } from './components/Todos';
import { Analytics } from './components/Analytics';
import { CalendarView } from './components/CalendarView';
import { Settings } from './components/Settings';
import { playBtnSound } from './lib/audio';

// Standard Initial Windows configurations
const INITIAL_WINDOWS = (isMobile: boolean): AppWindowState[] => [
  {
    id: 'timer',
    title: 'Focus Clock',
    isOpen: true,
    isMinimized: false,
    zIndex: 10,
    x: isMobile ? 10 : 80,
    y: isMobile ? 30 : 60,
    width: 360,
    height: 440,
  },
  {
    id: 'todos',
    title: 'Daftar Tugas',
    isOpen: isMobile ? false : true,
    isMinimized: false,
    zIndex: 5,
    x: isMobile ? 20 : 480,
    y: isMobile ? 50 : 60,
    width: 380,
    height: 440,
  },
  {
    id: 'analytics',
    title: 'Statistik Belajar',
    isOpen: false,
    isMinimized: false,
    zIndex: 1,
    x: isMobile ? 15 : 120,
    y: isMobile ? 40 : 100,
    width: 520,
    height: 420,
  },
  {
    id: 'calendar',
    title: 'Kontribusi & Riwayat',
    isOpen: false,
    isMinimized: false,
    zIndex: 1,
    x: isMobile ? 10 : 200,
    y: isMobile ? 55 : 120,
    width: 560,
    height: 410,
  },
  {
    id: 'settings',
    title: 'Pengaturan Fokus',
    isOpen: false,
    isMinimized: false,
    zIndex: 1,
    x: isMobile ? 15 : 300,
    y: isMobile ? 30 : 80,
    width: 380,
    height: 480,
  },
];

export default function App() {
  const [isMobile, setIsMobile] = useState(false);
  const [windowStates, setWindowStates] = useState<AppWindowState[]>([]);
  const [settings, setSettings] = useState<TimerSettings>(LocalStorage.getSettings());
  const [todos, setTodos] = useState<TodoItem[]>(LocalStorage.getTodos());
  const [sessions, setSessions] = useState<StudySession[]>(LocalStorage.getSessions());

  // User States
  const [user, setUser] = useState<User | null>(null);
  const [isStartMenuOpen, setIsStartMenuOpen] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  // Active Timer state synced in parent to share across timer & todo selector
  const [secondsRemaining, setSecondsRemaining] = useState(25 * 60);
  const [timerMode, setTimerMode] = useState<'focus' | 'shortBreak' | 'longBreak'>('focus');
  const [isActive, setIsActive] = useState(false);
  const [activeTodoId, setActiveTodoId] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Clock Tray state
  const [systemTime, setSystemTime] = useState('');

  // 1. Detect screen size
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Initialize Windows coordinates based on screen
  useEffect(() => {
    setWindowStates(INITIAL_WINDOWS(isMobile));
  }, [isMobile]);

  // 2. Clock update
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setSystemTime(now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }));
    };
    updateTime();
    const id = setInterval(updateTime, 1000);
    return () => clearInterval(id);
  }, []);

  // 3. Auth Listener & Firebase Cloud sync
  useEffect(() => {
    if (!isFirebaseEnabled) {
      return;
    }

    const unsubscribe = onAuthStateChanged(async (currentUser: User | null) => {
      setUser(currentUser);
      
      if (currentUser) {
        // Sync setting configuration
        const cloudSettings = await FirebaseSync.loadSettings(currentUser.id);
        setSettings(cloudSettings);

        // Sync tasklist
        const localItems = LocalStorage.getTodos();
        const syncedItems = await FirebaseSync.syncTodos(currentUser.id, localItems);
        setTodos(syncedItems);

        // Sync history logs
        const syncedSessions = await FirebaseSync.loadStudySessions(currentUser.id);
        setSessions(syncedSessions);
      } else {
        // Logged out, revert to local only
        setSettings(LocalStorage.getSettings());
        setTodos(LocalStorage.getTodos());
        setSessions(LocalStorage.getSessions());
      }
    });

    return () => unsubscribe();
  }, []);

  // Sync state helpers
  const saveSettings = async (newSettings: TimerSettings) => {
    setSettings(newSettings);
    if (user) {
      await FirebaseSync.saveSettings(user.id, newSettings);
    } else {
      LocalStorage.saveSettings(newSettings);
    }
  };

  const handleAddTodo = async (text: string, estimated: number) => {
    const newTodo: TodoItem = {
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9),
      text,
      completed: false,
      pomodorosEstimated: estimated,
      pomodorosCompleted: 0,
      createdAt: Date.now(),
    };
    const updatedTodos = [newTodo, ...todos];
    setTodos(updatedTodos);
    if (user) {
      await FirebaseSync.syncTodos(user.id, updatedTodos);
    } else {
      LocalStorage.saveTodos(updatedTodos);
    }
  };

  const handleToggleTodo = async (id: string) => {
    const updated = todos.map(todo => {
      if (todo.id === id) {
        return { ...todo, completed: !todo.completed };
      }
      return todo;
    });
    setTodos(updated);
    if (user) {
      await FirebaseSync.syncTodos(user.id, updated);
    } else {
      LocalStorage.saveTodos(updated);
    }
    // De-activate if completed
    if (activeTodoId === id) {
      setActiveTodoId(null);
    }
  };

  const handleDeleteTodo = async (id: string) => {
    const updated = todos.filter(t => t.id !== id);
    setTodos(updated);
    if (user) {
      await FirebaseSync.syncTodos(user.id, updated);
    } else {
      LocalStorage.saveTodos(updated);
    }
    if (activeTodoId === id) {
      setActiveTodoId(null);
    }
  };

  // Callback when a countdown timer ends
  const handleSessionComplete = async (type: 'focus' | 'shortBreak' | 'longBreak', duration: number) => {
    let completedTaskId: string | undefined;
    let completedTaskTitle: string | undefined;

    // Increment tomato score if completed focus task
    if (type === 'focus' && activeTodoId) {
      const activeTask = todos.find(t => t.id === activeTodoId);
      if (activeTask) {
        completedTaskId = activeTask.id;
        completedTaskTitle = activeTask.text;

        const updated = todos.map(t => {
          if (t.id === activeTodoId) {
            return { ...t, pomodorosCompleted: t.pomodorosCompleted + 1 };
          }
          return t;
        });
        setTodos(updated);
        if (user) {
          await FirebaseSync.syncTodos(user.id, updated);
        } else {
          LocalStorage.saveTodos(updated);
        }
      }
    }

    // Save study log
    const sessionPayload = {
      type,
      duration,
      timestamp: Date.now(),
      taskId: completedTaskId,
      taskTitle: completedTaskTitle,
    };

    if (user) {
      const savedSession = await FirebaseSync.addStudySession(user.id, sessionPayload);
      setSessions(prev => [savedSession, ...prev]);
    } else {
      const savedSession = LocalStorage.addSession(sessionPayload);
      setSessions(prev => [savedSession, ...prev]);
    }
  };

  // Window Management Actions
  const openWindow = (id: AppWindowState['id']) => {
    playBtnSound();
    setIsStartMenuOpen(false);
    setWindowStates(prev => {
      const maxZ = prev.length > 0 ? Math.max(...prev.map(w => w.zIndex)) : 10;
      return prev.map(w => {
        if (w.id === id) {
          return { ...w, isOpen: true, isMinimized: false, zIndex: maxZ + 1 };
        }
        return w;
      });
    });
  };

  const closeWindow = (id: AppWindowState['id']) => {
    playBtnSound();
    setWindowStates(prev => prev.map(w => w.id === id ? { ...w, isOpen: false } : w));
  };

  const minimizeWindow = (id: AppWindowState['id']) => {
    playBtnSound();
    setWindowStates(prev => prev.map(w => w.id === id ? { ...w, isMinimized: true } : w));
  };

  const bringToFront = (id: AppWindowState['id']) => {
    setWindowStates(prev => {
      const window = prev.find(w => w.id === id);
      if (!window) return prev;
      
      const maxZ = prev.length > 0 ? Math.max(...prev.map(w => w.zIndex)) : 10;
      
      // If window is minimized, maximize/restore it
      return prev.map(w => {
        if (w.id === id) {
          return { ...w, isMinimized: false, zIndex: maxZ + 1 };
        }
        return w;
      });
    });
  };

  // Draggable window logic using native mouse listener
  const startDrag = (e: React.MouseEvent, id: AppWindowState['id']) => {
    // Prevent dragging if clicking window control buttons
    const target = e.target as HTMLElement;
    if (target.closest('button')) return;

    e.preventDefault();
    const win = windowStates.find(w => w.id === id);
    if (!win) return;

    const startX = e.clientX - win.x;
    const startY = e.clientY - win.y;

    // Bring to front first
    bringToFront(id);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      setWindowStates(prev => prev.map(w => {
        if (w.id === id) {
          // Allow full floating with boundary margins
          return {
            ...w,
            x: moveEvent.clientX - startX,
            y: Math.max(0, moveEvent.clientY - startY), // prevent dragging past taskbar top
          };
        }
        return w;
      }));
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Authentication trigger
  const handleGoogleLogin = async () => {
    playBtnSound();
    try {
      const loggedUser = await loginWithGoogle();
      if (loggedUser) {
        setUser(loggedUser);
        setShowLoginModal(false);
      }
    } catch (e) {
      alert("Autentikasi Google gagal atau dibatalkan. Pastikan domain Anda terdaftar di Firebase Console Authorized Domains.");
    }
  };

  const handleLogout = async () => {
    playBtnSound();
    if (confirm("Apakah Anda yakin ingin keluar dari akun Anda?")) {
      await logoutUser();
      setUser(null);
      setIsStartMenuOpen(false);
    }
  };

  // Active Task string finder
  const activeTask = todos.find(t => t.id === activeTodoId);
  const activeTodoText = activeTask ? activeTask.text : null;

  return (
    <div 
      className="w-full h-screen overflow-hidden relative font-sans select-none flex flex-col"
      style={{ background: settings.themeBackground, backgroundSize: 'cover' }}
    >
      {/* 1. Desktop background visual overlays (Starry Night stars/lights) */}
      <div className="absolute inset-0 pointer-events-none opacity-20">
        <div className="absolute top-10 left-1/4 w-1 h-1 bg-white rounded-full animate-pulse"></div>
        <div className="absolute top-32 left-2/3 w-1.5 h-1.5 bg-white rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-2/3 left-1/3 w-1 h-1 bg-white rounded-full animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-1/2 left-4/5 w-1.5 h-1.5 bg-white rounded-full animate-pulse" style={{ animationDelay: '1.5s' }}></div>
      </div>

      {/* 2. Desktop Shortcuts */}
      <div className="p-4 flex flex-col gap-5 items-start absolute left-3 top-3 z-0">
        <button 
          onClick={() => openWindow('timer')}
          className="flex flex-col items-center gap-1 hover:bg-white/10 p-2.5 rounded-lg w-20 transition-all text-center group"
        >
          <div className="w-12 h-12 bg-rose-500/10 text-rose-400 group-hover:scale-105 transition-transform flex items-center justify-center rounded-xl border border-rose-500/20 shadow-md">
            <TimerIcon size={26} />
          </div>
          <span className="text-[10px] font-semibold text-slate-200 drop-shadow-md">Focus Clock</span>
        </button>

        <button 
          onClick={() => openWindow('todos')}
          className="flex flex-col items-center gap-1 hover:bg-white/10 p-2.5 rounded-lg w-20 transition-all text-center group"
        >
          <div className="w-12 h-12 bg-emerald-500/10 text-emerald-400 group-hover:scale-105 transition-transform flex items-center justify-center rounded-xl border border-emerald-500/20 shadow-md">
            <CheckSquare size={26} />
          </div>
          <span className="text-[10px] font-semibold text-slate-200 drop-shadow-md">Tugas</span>
        </button>

        <button 
          onClick={() => openWindow('calendar')}
          className="flex flex-col items-center gap-1 hover:bg-white/10 p-2.5 rounded-lg w-20 transition-all text-center group"
        >
          <div className="w-12 h-12 bg-sky-500/10 text-sky-400 group-hover:scale-105 transition-transform flex items-center justify-center rounded-xl border border-sky-500/20 shadow-md">
            <CalendarIcon size={26} />
          </div>
          <span className="text-[10px] font-semibold text-slate-200 drop-shadow-md">Riwayat</span>
        </button>

        <button 
          onClick={() => openWindow('analytics')}
          className="flex flex-col items-center gap-1 hover:bg-white/10 p-2.5 rounded-lg w-20 transition-all text-center group"
        >
          <div className="w-12 h-12 bg-amber-500/10 text-amber-400 group-hover:scale-105 transition-transform flex items-center justify-center rounded-xl border border-amber-500/20 shadow-md">
            <BarChart4 size={26} />
          </div>
          <span className="text-[10px] font-semibold text-slate-200 drop-shadow-md">Statistik</span>
        </button>

        <button 
          onClick={() => openWindow('settings')}
          className="flex flex-col items-center gap-1 hover:bg-white/10 p-2.5 rounded-lg w-20 transition-all text-center group"
        >
          <div className="w-12 h-12 bg-slate-500/10 text-slate-300 group-hover:scale-105 transition-transform flex items-center justify-center rounded-xl border border-slate-500/20 shadow-md">
            <SettingsIcon size={26} />
          </div>
          <span className="text-[10px] font-semibold text-slate-200 drop-shadow-md">Setelan</span>
        </button>
      </div>

      {/* 3. Floating Windows Layer */}
      <div className="flex-1 relative w-full h-full p-4 overflow-hidden">
        {windowStates.map((win) => {
          if (!win.isOpen || win.isMinimized) return null;

          return (
            <div
              key={win.id}
              className="absolute glass-panel rounded-xl window-shadow flex flex-col overflow-hidden resize select-none"
              style={{
                left: `${win.x}px`,
                top: `${win.y}px`,
                width: isMobile ? 'calc(100% - 32px)' : `${win.width}px`,
                height: isMobile ? 'calc(100% - 90px)' : `${win.height}px`,
                zIndex: win.zIndex,
                maxWidth: isMobile ? '100%' : '90vw',
                maxHeight: isMobile ? '100%' : '85vh',
              }}
              onMouseDown={() => bringToFront(win.id)}
            >
              {/* Window Titlebar */}
              <div
                onMouseDown={(e) => !isMobile && startDrag(e, win.id)}
                className="bg-slate-950/60 border-b border-white/5 px-4 py-3 flex items-center justify-between cursor-move text-slate-200"
              >
                <div className="flex items-center gap-2">
                  {win.id === 'timer' && <TimerIcon size={14} className="text-rose-400" />}
                  {win.id === 'todos' && <CheckSquare size={14} className="text-emerald-400" />}
                  {win.id === 'calendar' && <CalendarIcon size={14} className="text-sky-400" />}
                  {win.id === 'analytics' && <BarChart4 size={14} className="text-amber-400" />}
                  {win.id === 'settings' && <SettingsIcon size={14} className="text-slate-400" />}
                  <span className="text-xs font-bold uppercase tracking-wider">{win.title}</span>
                </div>

                {/* Window control buttons */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => minimizeWindow(win.id)}
                    className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-slate-200 transition-colors"
                    title="Minimize"
                  >
                    <Minus size={12} />
                  </button>
                  <button
                    onClick={() => closeWindow(win.id)}
                    className="p-1 rounded hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors"
                    title="Close"
                  >
                    <X size={12} />
                  </button>
                </div>
              </div>

              {/* Window Client Area */}
              <div className="flex-1 overflow-y-auto bg-slate-900/30">
                {win.id === 'timer' && (
                  <Timer
                    settings={settings}
                    activeTodoText={activeTodoText}
                    onSessionComplete={handleSessionComplete}
                    secondsRemaining={secondsRemaining}
                    setSecondsRemaining={setSecondsRemaining}
                    timerMode={timerMode}
                    setTimerMode={setTimerMode}
                    isActive={isActive}
                    setIsActive={setIsActive}
                    pomodorosCompleted={sessions.filter(s => s.type === 'focus').length}
                    soundEnabled={soundEnabled}
                    setSoundEnabled={setSoundEnabled}
                  />
                )}
                {win.id === 'todos' && (
                  <Todos
                    todos={todos}
                    onAddTodo={handleAddTodo}
                    onToggleTodo={handleToggleTodo}
                    onDeleteTodo={handleDeleteTodo}
                    activeTodoId={activeTodoId}
                    onSetActiveTodo={setActiveTodoId}
                  />
                )}
                {win.id === 'analytics' && (
                  <Analytics
                    sessions={sessions}
                    todos={todos}
                  />
                )}
                {win.id === 'calendar' && (
                  <CalendarView
                    sessions={sessions}
                  />
                )}
                {win.id === 'settings' && (
                  <Settings
                    settings={settings}
                    onSave={saveSettings}
                    isFirebaseConnected={!!user}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 4. Start Menu Dropup Popup */}
      {isStartMenuOpen && (
        <div className="absolute bottom-[52px] left-3 w-64 bg-slate-900/95 border border-slate-700/60 window-shadow rounded-xl overflow-hidden z-50 flex flex-col">
          {/* Start Menu Header / User profile banner */}
          <div className="bg-slate-950 px-4 py-4 border-b border-slate-800 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-300 overflow-hidden shadow-inner">
              {user?.photoURL ? (
                <img src={user.photoURL} alt="User avatar" className="w-full h-full object-cover" />
              ) : (
                <UserIcon size={18} />
              )}
            </div>
            <div className="flex flex-col text-xs">
              <span className="font-bold text-slate-100 truncate max-w-[150px]">
                {user ? user.displayName || 'Akun Belajar' : 'Tamu (Lokal)'}
              </span>
              <span className="text-[10px] text-slate-400 truncate max-w-[150px]">
                {user ? user.email : 'Belum tersinkronisasi'}
              </span>
            </div>
          </div>

          {/* Quick list of app launchers */}
          <div className="p-2 flex flex-col gap-0.5 border-b border-slate-800/80">
            <button
              onClick={() => openWindow('timer')}
              className="w-full text-left px-3 py-2 text-xs rounded hover:bg-rose-500/10 hover:text-rose-300 text-slate-300 flex items-center gap-2.5 transition-colors"
            >
              <TimerIcon size={14} className="text-rose-400" />
              <span>Buka Focus Clock</span>
            </button>
            <button
              onClick={() => openWindow('todos')}
              className="w-full text-left px-3 py-2 text-xs rounded hover:bg-emerald-500/10 hover:text-emerald-300 text-slate-300 flex items-center gap-2.5 transition-colors"
            >
              <CheckSquare size={14} className="text-emerald-400" />
              <span>Buka Daftar Tugas</span>
            </button>
            <button
              onClick={() => openWindow('calendar')}
              className="w-full text-left px-3 py-2 text-xs rounded hover:bg-sky-500/10 hover:text-sky-300 text-slate-300 flex items-center gap-2.5 transition-colors"
            >
              <CalendarIcon size={14} className="text-sky-400" />
              <span>Buka Papan Riwayat</span>
            </button>
            <button
              onClick={() => openWindow('analytics')}
              className="w-full text-left px-3 py-2 text-xs rounded hover:bg-amber-500/10 hover:text-amber-300 text-slate-300 flex items-center gap-2.5 transition-colors"
            >
              <BarChart4 size={14} className="text-amber-400" />
              <span>Buka Statistik</span>
            </button>
            <button
              onClick={() => openWindow('settings')}
              className="w-full text-left px-3 py-2 text-xs rounded hover:bg-slate-500/10 hover:text-slate-300 text-slate-300 flex items-center gap-2.5 transition-colors"
            >
              <SettingsIcon size={14} className="text-slate-400" />
              <span>Setelan & Wallpaper</span>
            </button>
          </div>

          {/* Auth section trigger */}
          <div className="p-2 bg-slate-950/60 flex items-center justify-between">
            {user ? (
              <button
                onClick={handleLogout}
                className="w-full text-left px-3 py-2 text-xs rounded hover:bg-rose-500/10 text-rose-400 font-semibold flex items-center gap-2.5 transition-colors"
              >
                <LogOut size={14} />
                <span>Sign Out Akun</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  playBtnSound();
                  setIsStartMenuOpen(false);
                  setShowLoginModal(true);
                }}
                className="w-full text-left px-3 py-2 text-xs rounded hover:bg-emerald-500/10 text-emerald-400 font-semibold flex items-center gap-2.5 transition-colors"
              >
                <LogIn size={14} />
                <span>Sign In dengan Google</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* 5. Bottom Taskbar Menu */}
      <div className="h-12 w-full bg-slate-950/95 border-t border-white/5 px-3 py-1.5 flex items-center justify-between z-40 select-none shrink-0">
        <div className="flex items-center gap-2.5 overflow-x-auto max-w-[70%]">
          {/* Windows Logo Start Button */}
          <button
            onClick={() => {
              playBtnSound();
              setIsStartMenuOpen(!isStartMenuOpen);
            }}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider transition-all shadow-md ${
              isStartMenuOpen
                ? 'bg-rose-600 text-white shadow-rose-950/50'
                : 'bg-slate-900 border border-slate-800 text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Monitor size={14} className={isStartMenuOpen ? "text-white" : "text-rose-500"} />
            <span>Start</span>
          </button>

          {/* Taskbar open windows listings */}
          <span className="h-5 w-[1px] bg-slate-800"></span>

          {windowStates.map((win) => {
            if (!win.isOpen) return null;
            const isWindowFront = !win.isMinimized && win.zIndex === Math.max(...windowStates.filter(w => w.isOpen && !w.isMinimized).map(w => w.zIndex));
            
            return (
              <button
                key={win.id}
                onClick={() => {
                  playBtnSound();
                  if (win.isMinimized || !isWindowFront) {
                    bringToFront(win.id);
                  } else {
                    minimizeWindow(win.id);
                  }
                }}
                className={`px-3 py-1 rounded text-xs transition-all max-w-[120px] truncate ${
                  isWindowFront && !win.isMinimized
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-inner'
                    : 'bg-slate-900/60 border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                {win.title}
              </button>
            );
          })}
        </div>

        {/* Taskbar Right Tray (Clock / User account / Firebase connection status) */}
        <div className="flex items-center gap-3">
          {user ? (
            <div 
              className="flex items-center gap-2 bg-slate-900/80 px-2.5 py-1 rounded-lg border border-slate-800 text-[10px] text-emerald-400 font-semibold cursor-pointer"
              title={`Tersambung sebagai ${user.email}`}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="hidden sm:inline">Firebase Connected</span>
            </div>
          ) : (
            <button
              onClick={() => {
                playBtnSound();
                setShowLoginModal(true);
              }}
              className="flex items-center gap-2 bg-slate-900/80 hover:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-800 text-[10px] text-slate-400 hover:text-rose-400 font-semibold transition-all"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-slate-600"></div>
              <span>Sign In</span>
            </button>
          )}

          <div className="bg-slate-900/80 px-2.5 py-1 rounded-lg border border-slate-800 text-xs font-mono font-bold text-slate-300 select-none">
            {systemTime || '12:00'}
          </div>
        </div>
      </div>

      {/* 6. Firebase login / Sign In Modal popup */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-xl window-shadow w-full max-w-sm overflow-hidden flex flex-col">
            <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
              <span className="text-xs font-bold uppercase text-slate-300">Firebase Cloud Sync</span>
              <button 
                onClick={() => {
                  playBtnSound();
                  setShowLoginModal(false);
                }}
                className="text-slate-500 hover:text-slate-300 p-0.5 rounded transition-colors"
              >
                <X size={15} />
              </button>
            </div>

            <div className="p-5 flex flex-col items-center text-center gap-4">
              <div className="w-12 h-12 bg-rose-500/10 text-rose-400 rounded-full flex items-center justify-center animate-float">
                <TimerIcon size={24} />
              </div>

              <div className="flex flex-col gap-1.5">
                <h3 className="font-bold text-base text-slate-100">Hubungkan Kemajuan Belajar Anda</h3>
                <p className="text-xs text-slate-400 leading-relaxed px-1">
                  Masuk dengan akun Google Anda untuk menyimpan sesi Pomodoro, daftar tugas, dan riwayat kontribusi secara otomatis ke database cloud Firestore.
                </p>
              </div>

              <button
                onClick={handleGoogleLogin}
                className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg text-xs shadow transition-colors flex items-center justify-center gap-2"
              >
                <LogIn size={14} />
                <span>Lanjutkan dengan Akun Google</span>
              </button>

              <button
                onClick={() => {
                  playBtnSound();
                  setShowLoginModal(false);
                }}
                className="text-xs text-slate-500 hover:text-slate-300 font-medium py-1"
              >
                Lanjutkan sebagai Tamu (Offline)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
