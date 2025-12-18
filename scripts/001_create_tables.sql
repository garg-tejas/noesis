-- Create profiles table
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create knowledge_entries table
create table if not exists public.knowledge_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_type text not null check (source_type in ('twitter', 'blog', 'other')),
  original_url text not null,
  author text not null,
  raw_text text,
  distilled jsonb not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  is_favorite boolean default false,
  user_notes text
);

-- Create contradictions table
create table if not exists public.contradictions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  item1_id uuid not null references public.knowledge_entries(id) on delete cascade,
  item2_id uuid not null references public.knowledge_entries(id) on delete cascade,
  description text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security
alter table public.profiles enable row level security;
alter table public.knowledge_entries enable row level security;
alter table public.contradictions enable row level security;

-- Profiles policies
create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Knowledge entries policies
create policy "Users can view their own entries"
  on public.knowledge_entries for select
  using (auth.uid() = user_id);

create policy "Users can insert their own entries"
  on public.knowledge_entries for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own entries"
  on public.knowledge_entries for update
  using (auth.uid() = user_id);

create policy "Users can delete their own entries"
  on public.knowledge_entries for delete
  using (auth.uid() = user_id);

-- Contradictions policies
create policy "Users can view their own contradictions"
  on public.contradictions for select
  using (auth.uid() = user_id);

create policy "Users can insert their own contradictions"
  on public.contradictions for insert
  with check (auth.uid() = user_id);

create policy "Users can delete their own contradictions"
  on public.contradictions for delete
  using (auth.uid() = user_id);

-- Create indexes for better performance
create index if not exists knowledge_entries_user_id_idx on public.knowledge_entries(user_id);
create index if not exists knowledge_entries_created_at_idx on public.knowledge_entries(created_at desc);
create index if not exists contradictions_user_id_idx on public.contradictions(user_id);
