export type ThemeColor = 'amber' | 'rose' | 'teal' | 'blue' | 'violet' | 'monochrome';

export interface TimerSettings {
  focusTime: number; // in minutes
  shortBreak: number; // in minutes
  longBreak: number; // in minutes
  longBreakInterval: number; // number of focus sessions before a long break
  soundVolume: number; // 0 to 1
  soundTheme: 'classic' | 'digital' | 'soft' | 'nature';
  autoStartBreaks: boolean;
  autoStartPomodoros: boolean;
  themeBackground: string;
  themeColor: ThemeColor;
  notifyOnComplete: boolean;
  dailyTarget: number;
  customDuration: number; // in minutes
}

export const THEME_COLORS: Array<{ id: ThemeColor; label: string; hex: string }> = [
  { id: 'amber', label: 'Amber Hangat', hex: '#d9a441' },
  { id: 'rose', label: 'Rose Lembut', hex: '#d9839e' },
  { id: 'teal', label: 'Teal Tenang', hex: '#7fa88a' },
  { id: 'blue', label: 'Biru Senja', hex: '#7a93b8' },
  { id: 'violet', label: 'Violet Ungu', hex: '#a38bc0' },
  { id: 'monochrome', label: 'Monokrom', hex: '#9aa0b0' },
];

export interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
  pomodorosEstimated: number;
  pomodorosCompleted: number;
  createdAt: number;
  tag?: string;
}

export interface StudySession {
  id: string;
  type: 'focus' | 'shortBreak' | 'longBreak' | 'custom';
  duration: number; // in seconds
  timestamp: number; // epoch
  taskId?: string;
  taskTitle?: string;
}

export interface AppWindowState {
  id: 'timer' | 'todos' | 'settings' | 'analytics' | 'calendar';
  title: string;
  isOpen: boolean;
  isMinimized: boolean;
  zIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DailyStat {
  date: string; // YYYY-MM-DD
  focusDuration: number; // in seconds
  pomodorosCount: number;
  tasksCompleted: number;
}
