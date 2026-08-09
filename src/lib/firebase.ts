import { createClient, SupabaseClient } from '@supabase/supabase-js';
export interface User { id: string; displayName?: string | null; photoURL?: string | null; email?: string | null; }
import { TimerSettings, TodoItem, StudySession } from '../types';
import { LocalStorage } from './storage';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
export const isFirebaseEnabled = Boolean(url && key);
export const isSupabaseEnabled = isFirebaseEnabled;
export const supabase: SupabaseClient = createClient(url || 'https://placeholder.supabase.co', key || 'placeholder-anon-key');
export const auth = supabase.auth;
export const db = supabase;

export async function loginWithGoogle(): Promise<User | null> {
  if (!isSupabaseEnabled) throw new Error('Supabase belum dikonfigurasi.');
  const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } });
  if (error) throw error;
  return null;
}
export async function logoutUser() { if (isSupabaseEnabled) await supabase.auth.signOut(); }

export const FirebaseSync = {
  async saveSettings(userId: string, settings: TimerSettings) { LocalStorage.saveSettings(settings); if (isSupabaseEnabled) await supabase.from('user_settings').upsert({ user_id: userId, settings }); },
  async loadSettings(userId: string) { const local=LocalStorage.getSettings(); if (!isSupabaseEnabled) return local; const {data}=await supabase.from('user_settings').select('settings').eq('user_id',userId).maybeSingle(); if(data?.settings){LocalStorage.saveSettings(data.settings);return data.settings as TimerSettings;} return local; },
  async syncTodos(userId: string, todos: TodoItem[]) { LocalStorage.saveTodos(todos); if(!isSupabaseEnabled)return todos; await supabase.from('todos').upsert(todos.map(data=>({user_id:userId,id:data.id,data}))); const {data}=await supabase.from('todos').select('data').eq('user_id',userId); const merged=[...new Map([...todos,...(data||[]).map(r=>r.data as TodoItem)].map(t=>[t.id,t])).values()]; LocalStorage.saveTodos(merged); return merged; },
  async addStudySession(userId: string, session: Omit<StudySession,'id'>) { const created=LocalStorage.addSession(session); if(isSupabaseEnabled) await supabase.from('study_sessions').upsert({user_id:userId,id:created.id,data:created}); return created; },
  async loadStudySessions(userId: string) { const local=LocalStorage.getSessions(); if(!isSupabaseEnabled)return local; const {data}=await supabase.from('study_sessions').select('data').eq('user_id',userId); const merged=[...new Map([...local,...(data||[]).map(r=>r.data as StudySession)].map(s=>[s.id,s])).values()]; LocalStorage.saveSessions(merged); return merged; }
};
export const SupabaseSync = FirebaseSync;
export const onAuthStateChanged = (callback: (user: User | null) => void) => {
  if (!isSupabaseEnabled) return () => undefined;
  void supabase.auth.getUser().then(({ data }) => callback(data.user));
  const { data } = supabase.auth.onAuthStateChange((_event, session) => callback(session?.user ?? null));
  return () => data.subscription.unsubscribe();
};

