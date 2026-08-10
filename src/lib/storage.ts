import { TimerSettings, TodoItem, StudySession } from '../types';
import { getLocalDateString } from './utils';

const STORAGE_KEYS = {
  SETTINGS: 'focus_popup_settings',
  TODOS: 'focus_popup_todos',
  SESSIONS: 'focus_popup_sessions',
};

const DEFAULT_SETTINGS: TimerSettings = {
  focusTime: 25,
  shortBreak: 5,
  longBreak: 15,
  longBreakInterval: 4,
  soundVolume: 0.5,
  soundTheme: 'soft',
  autoStartBreaks: true,
  autoStartPomodoros: false,
  themeBackground: 'linear-gradient(to right, #0f172a, #1e1b4b)',
  themeColor: 'amber' as const,
};

export const LocalStorage = {
  getSettings(): TimerSettings {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (data) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
      }
    } catch (e) {
      console.warn("LocalStorage access failed:", e);
    }
    return DEFAULT_SETTINGS;
  },

  saveSettings(settings: TimerSettings) {
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    } catch (e) {
      console.warn("LocalStorage write failed:", e);
    }
  },

  getTodos(): TodoItem[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.TODOS);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.warn("LocalStorage access failed:", e);
    }
    return [];
  },

  saveTodos(todos: TodoItem[]) {
    try {
      localStorage.setItem(STORAGE_KEYS.TODOS, JSON.stringify(todos));
    } catch (e) {
      console.warn("LocalStorage write failed:", e);
    }
  },

  getSessions(): StudySession[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SESSIONS);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.warn("LocalStorage access failed:", e);
    }
    return [];
  },

  saveSessions(sessions: StudySession[]) {
    try {
      localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
    } catch (e) {
      console.warn("LocalStorage write failed:", e);
    }
  },

  addSession(session: Omit<StudySession, 'id'>): StudySession {
    const newSession: StudySession = {
      ...session,
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9),
    };
    const sessions = this.getSessions();
    sessions.push(newSession);
    this.saveSessions(sessions);
    return newSession;
  },

  getDailyStats() {
    const sessions = this.getSessions();
    const todos = this.getTodos();
    
    // Group sessions by local date
    const statsMap: Record<string, { duration: number; count: number; completedTasks: number }> = {};
    
    sessions.forEach(s => {
      if (s.type === 'focus') {
        const dateStr = getLocalDateString(s.timestamp);
        if (!statsMap[dateStr]) {
          statsMap[dateStr] = { duration: 0, count: 0, completedTasks: 0 };
        }
        statsMap[dateStr].duration += s.duration;
        statsMap[dateStr].count += 1;
      }
    });

    // We can also estimate completed tasks per day if they have dates, but for now we look at general stats
    return Object.entries(statsMap).map(([date, data]) => ({
      date,
      focusDuration: data.duration,
      pomodorosCount: data.count,
      tasksCompleted: todos.filter(t => t.completed).length, // simple fallback
    })).sort((a, b) => a.date.localeCompare(b.date));
  }
};
