create table if not exists public.user_settings (user_id uuid primary key references auth.users(id) on delete cascade, settings jsonb not null, updated_at timestamptz default now());
create table if not exists public.todos (user_id uuid references auth.users(id) on delete cascade, id text not null, data jsonb not null, primary key(user_id,id));
create table if not exists public.study_sessions (user_id uuid references auth.users(id) on delete cascade, id text not null, data jsonb not null, primary key(user_id,id));
alter table public.user_settings enable row level security;
alter table public.todos enable row level security;
alter table public.study_sessions enable row level security;
create policy "own settings" on public.user_settings for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
create policy "own todos" on public.todos for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
create policy "own sessions" on public.study_sessions for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
