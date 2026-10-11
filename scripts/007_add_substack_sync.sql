-- Experimental personal Substack reader sync.
-- The credential is encrypted by the application before it reaches this table.

create table if not exists public.substack_integrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  encrypted_session text not null,
  remote_user_id text not null,
  remote_handle text,
  sync_likes boolean not null default true,
  sync_saves boolean not null default true,
  status text not null default 'active' check (status in ('active', 'paused', 'reauth_required')),
  last_synced_at timestamp with time zone,
  last_error text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (user_id)
);

create table if not exists public.substack_sync_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  integration_id uuid not null references public.substack_integrations(id) on delete cascade,
  interaction_type text not null check (interaction_type in ('like', 'save')),
  remote_event_id text not null,
  post_url text not null,
  status text not null default 'queued' check (status in ('queued', 'processed', 'skipped', 'failed')),
  knowledge_entry_id uuid references public.knowledge_entries(id) on delete set null,
  error text,
  attempt_count integer not null default 0,
  available_at timestamp with time zone default timezone('utc'::text, now()) not null,
  discovered_at timestamp with time zone default timezone('utc'::text, now()) not null,
  processed_at timestamp with time zone,
  unique (integration_id, interaction_type, remote_event_id)
);

alter table public.substack_integrations enable row level security;
alter table public.substack_sync_events enable row level security;

create policy "Users can manage their own Substack integration"
  on public.substack_integrations for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can view their own Substack sync events"
  on public.substack_sync_events for select
  using (auth.uid() = user_id);

create index if not exists substack_sync_events_pending_idx
  on public.substack_sync_events (integration_id, status, available_at asc);
