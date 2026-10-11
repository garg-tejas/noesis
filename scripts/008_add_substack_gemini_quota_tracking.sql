create table if not exists public.substack_gemini_requests (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.substack_sync_events(id) on delete cascade,
  attempted_at timestamp with time zone not null default now()
);

create index if not exists substack_gemini_requests_attempted_idx
  on public.substack_gemini_requests (attempted_at desc);

alter table public.substack_gemini_requests enable row level security;

create or replace function public.reserve_substack_gemini_request(p_event_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  minute_count integer;
  day_count integer;
begin
  perform pg_advisory_xact_lock(hashtext('substack_gemini_quota'));

  select count(*) into minute_count
  from public.substack_gemini_requests
  where attempted_at >= now() - interval '1 minute';

  select count(*) into day_count
  from public.substack_gemini_requests
  where attempted_at >= (date_trunc('day', now() at time zone 'utc') at time zone 'utc');

  if minute_count >= 5 or day_count >= 20 then
    return false;
  end if;

  insert into public.substack_gemini_requests (event_id)
  values (p_event_id);

  return true;
end;
$$;

revoke all on function public.reserve_substack_gemini_request(uuid) from public;
grant execute on function public.reserve_substack_gemini_request(uuid) to service_role;
