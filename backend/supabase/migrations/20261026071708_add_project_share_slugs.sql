alter table public.projects
  add column if not exists slug text;

update public.profiles
set slug =
  coalesce(
    nullif(
      trim(
        both '-'
        from regexp_replace(lower(slug), '[^a-z0-9]+', '-', 'g')
      ),
      ''
    ),
    'maker'
  )
where slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$';

update public.projects
set slug =
  coalesce(
    nullif(
      trim(
        both '-'
        from regexp_replace(lower(title), '[^a-z0-9]+', '-', 'g')
      ),
      ''
    ),
    'project'
  )
  || '-'
  || replace(id::text, '-', '')
where slug is null;

alter table public.projects
  alter column slug set not null;

create unique index if not exists projects_owner_profile_id_slug_key
  on public.projects (owner_profile_id, slug);