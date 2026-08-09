import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { TimerSettings, TodoItem, StudySession } from '../types';
import { LocalStorage } from './storage';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
export const isSupabaseEnabled = Boolean(url && anonKey);
export const supabase: SupabaseClient = createClient(url || 'https://placeholder.supabase.co', anonKey || 'placeholder-anon-key');

export async function loginWithGoogle(): Promise<User | null> {
  if (!isSupabaseEnabled) throw new Error('Supabase belum dikonfigurasi.');
  const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } });
  if (error) throw error;
  return null;
}
export async function logoutUser() { if (isSupabaseEnabled) await supabase.auth.signOut(); }

export const SupabaseSync = {
  async saveSettings(userId: string, settings: TimerSettings) {
    LocalStorage.saveSettings(settings);
    if (isSupabaseEnabled) { const { error } = await supabase.from('user_settings').upsert({ user_id: userId, settings }); if (error) console.warn(error); }
  },
  async loadSettings(userId: string) {
    const local = LocalStorage.getSettings();
    if (!isSupabaseEnabled) return local;
    const { data } = await supabase.from('user_settings').select('settings').eq('user_id', userId).maybeSingle();
    if (data?.settings) { LocalStorage.saveSettings(data.settings); return data.settings as TimerSettings; }
    return local;
  },
  async syncTodos(userId: string, todos: TodoItem[]) {
    LocalStorage.saveTodos(todos);
    if (!isSupabaseEnabled) return todos;
    const { error } = await supabase.from('todos').upsert(todos.map(todo => ({ user_id: userId, id: todo.id, data: todo })));
    if (error) { console.warn(error); return todos; }
    const { data } = await supabase.from('todos').select('data').eq('user_id', userId);
    const merged = [...new Map([ ...todos, ...(data || []).map(row => row.data as TodoItem) ].map(todo => [todo.id, todo])).values()].sort((a,b) => b.createdAt - a.createdAt);
    LocalStorage.saveTodos(merged); return merged;
  },
  async addStudySession(userId: string, session: Omit<StudySession, 'id'>) {
    const created = LocalStorage.addSession(session);
    if (isSupabaseEnabled) await supabase.from('study_sessions').upsert({ user_id: userId, id: created.id, data: created });
    return created;
  },
  async loadStudySessions(userId: string) {
    const local = LocalStorage.getSessions();
    if (!isSupabaseEnabled) return local;
    const { data } = await supabase.from('study_sessions').select('data').eq('user_id', userId);
    const merged = [...new Map([ ...local, ...(data || []).map(row => row.data as StudySession) ].map(s => [s.id, s])).values()].sort((a,b) => b.timestamp - a.timestamp);
    LocalStorage.saveSessions(merged); return merged;
  }
};

export type { User };
export const auth = supabase.auth;
export const db = supabase;
export const isFirebaseEnabled = isSupabaseEnabled;
export const FirebaseSync = SupabaseSync;
