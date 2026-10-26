alter table public.profiles
  add column if not exists primary_craft text;

alter table public.profiles
  drop constraint if exists profiles_primary_craft_length;

alter table public.profiles
  add constraint profiles_primary_craft_length
  check (primary_craft is null or char_length(primary_craft) between 1 and 80);

alter table public.projects
  add column if not exists category_label text;

alter table public.projects
  drop constraint if exists projects_category_label_length;

alter table public.projects
  add constraint projects_category_label_length
  check (category_label is null or char_length(category_label) between 1 and 80);

alter table public.project_updates
  add column if not exists title text not null default 'Progress update',
  add column if not exists stage text not null default 'planned';

update public.project_updates updates
set stage = projects.stage
from public.projects
where projects.id = updates.project_id;

alter table public.project_updates
  drop constraint if exists project_updates_title_length,
  drop constraint if exists project_updates_stage_check;

alter table public.project_updates
  add constraint project_updates_title_length
  check (char_length(title) between 1 and 100),
  add constraint project_updates_stage_check
  check (stage in ('planned', 'in_progress', 'completed'));

create or replace function public.create_project_update(
  p_project_id uuid,
  p_title text,
  p_content text,
  p_stage text
)
returns public.project_updates
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_visibility text;
  current_publication_status text;
  new_update public.project_updates;
begin
  select visibility, publication_status
  into current_visibility, current_publication_status
  from public.projects
  where id = p_project_id
    and owner_profile_id = (select auth.uid());

  if not found then
    raise exception using errcode = 'P0002', message = 'Project not found';
  end if;

  insert into public.project_updates (
    project_id,
    author_profile_id,
    title,
    content,
    stage,
    visibility,
    publication_status,
    published_at
  )
  values (
    p_project_id,
    (select auth.uid()),
    p_title,
    p_content,
    p_stage,
    case
      when current_visibility = 'public' and current_publication_status = 'published' then 'public'
      else 'private'
    end,
    case
      when current_visibility = 'public' and current_publication_status = 'published' then 'published'
      else 'draft'
    end,
    case
      when current_visibility = 'public' and current_publication_status = 'published' then now()
      else null
    end
  )
  returning * into new_update;

  update public.projects
  set stage = p_stage
  where id = p_project_id
    and owner_profile_id = (select auth.uid());

  return new_update;
end;
$$;

revoke all on function public.create_project_update(uuid, text, text, text)
  from public, anon, authenticated, service_role;
grant execute on function public.create_project_update(uuid, text, text, text)
  to authenticated;

create or replace function public.publish_project(p_project_id uuid)
returns public.projects
language plpgsql
security invoker
set search_path = ''
as $$
declare
  published_project public.projects;
begin
  if not exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and is_public
  ) then
    raise exception using errcode = '23514', message = 'A public profile is required';
  end if;

  update public.projects
  set visibility = 'public',
      publication_status = 'published',
      published_at = coalesce(published_at, now())
  where id = p_project_id
    and owner_profile_id = (select auth.uid())
  returning * into published_project;

  if not found then
    raise exception using errcode = 'P0002', message = 'Project not found';
  end if;

  update public.project_updates
  set visibility = 'public',
      publication_status = 'published',
      published_at = coalesce(published_at, now())
  where project_id = p_project_id
    and author_profile_id = (select auth.uid());

  return published_project;
end;
$$;

revoke all on function public.publish_project(uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.publish_project(uuid)
  to authenticated;