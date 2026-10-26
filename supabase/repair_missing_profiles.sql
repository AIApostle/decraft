-- Run this in the Supabase SQL Editor to create profiles for existing Auth users
-- that do not yet have a matching row in public.profiles.
with users_without_profiles as (
  select
    u.id,
    case
      when u.raw_user_meta_data ->> 'profile_type' in ('individual', 'workshop', 'business')
        then u.raw_user_meta_data ->> 'profile_type'
      else 'individual'
    end as profile_type,
    left(
      coalesce(
        nullif(btrim(u.raw_user_meta_data ->> 'display_name'), ''),
        nullif(btrim(u.raw_user_meta_data ->> 'full_name'), ''),
        nullif(split_part(coalesce(u.email, ''), '@', 1), ''),
        'Maker'
      ),
      80
    ) as display_name
  from auth.users u
  left join public.profiles p on p.id = u.id
  where p.id is null
)
insert into public.profiles (id, profile_type, display_name, slug)
select
  id,
  profile_type,
  case when char_length(display_name) >= 2 then display_name else 'Maker' end,
  coalesce(
    nullif(trim(both '-' from regexp_replace(lower(display_name), '[^a-z0-9]+', '-', 'g')), ''),
    'maker'
  ) || '-' || replace(id::text, '-', '')
from users_without_profiles
on conflict (id) do nothing;

-- Check that no Auth users are missing profiles; this should return zero.
select count(*) as auth_users_missing_profiles
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;
