create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  profile_type text not null check (profile_type in ('individual', 'workshop', 'business')),
  display_name text not null check (char_length(display_name) between 2 and 80),
  slug text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

grant select, update on public.profiles to authenticated;

drop policy if exists "Profile owners can read their profile" on public.profiles;
create policy "Profile owners can read their profile"
  on public.profiles
  for select
  to authenticated
  using ((select auth.uid()) = id);

drop policy if exists "Profile owners can update their profile" on public.profiles;
create policy "Profile owners can update their profile"
  on public.profiles
  for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create or replace function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_display_name text := btrim(coalesce(new.raw_user_meta_data ->> 'display_name', ''));
  new_profile_type text := coalesce(new.raw_user_meta_data ->> 'profile_type', 'individual');
begin
  if char_length(new_display_name) < 2 or char_length(new_display_name) > 80 then
    raise exception 'A valid display name is required to create a profile';
  end if;

  if new_profile_type not in ('individual', 'workshop', 'business') then
    raise exception 'Unsupported profile type';
  end if;

  insert into public.profiles (id, profile_type, display_name, slug)
  values (
    new.id,
    new_profile_type,
    new_display_name,
    lower(regexp_replace(new_display_name, '[^a-zA-Z0-9]+', '-', 'g')) || '-' ||
      left(replace(new.id::text, '-', ''), 8)
  );

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_create_profile on auth.users;
create trigger on_auth_user_created_create_profile
  after insert on auth.users
  for each row execute function public.create_profile_for_new_user();
