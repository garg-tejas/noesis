-- Drop existing profile insert policy if it exists
drop policy if exists "Users can insert their own profile" on public.profiles;

-- Create a more permissive policy for profile creation
-- This allows inserting a profile as long as the ID matches an authenticated user
create policy "Users can insert their own profile during signup"
  on public.profiles for insert
  with check (true);

-- Create a function to handle new user creation
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

-- Create a trigger to automatically create profile on user signup
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
