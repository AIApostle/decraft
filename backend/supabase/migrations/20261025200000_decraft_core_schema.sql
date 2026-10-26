alter table public.profiles
  add column if not exists bio text,
  add column if not exists avatar_path text,
  add column if not exists city text,
  add column if not exists state text,
  add column if not exists service_area text[] not null default '{}',
  add column if not exists availability text,
  add column if not exists price_min numeric(12, 2),
  add column if not exists price_max numeric(12, 2),
  add column if not exists currency_code text not null default 'NGN',
  add column if not exists is_public boolean not null default false;

alter table public.profiles
  drop constraint if exists profiles_availability_check,
  drop constraint if exists profiles_price_range_check,
  drop constraint if exists profiles_currency_code_check;

alter table public.profiles
  add constraint profiles_availability_check
    check (availability is null or availability in ('available', 'limited', 'unavailable')),
  add constraint profiles_price_range_check
    check (
      (price_min is null or price_min >= 0)
      and (price_max is null or price_max >= 0)
      and (price_min is null or price_max is null or price_min <= price_max)
    ),
  add constraint profiles_currency_code_check
    check (currency_code ~ '^[A-Z]{3}$');

create table if not exists public.profile_contacts (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  phone text,
  whatsapp text,
  contact_preferences jsonb not null default '{"in_app": true}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.craft_categories (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.craft_categories (id) on delete set null,
  slug text not null unique,
  name text not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint craft_categories_name_length check (char_length(name) between 1 and 100)
);

create table if not exists public.profile_services (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  category_id uuid not null references public.craft_categories (id) on delete restrict,
  service_description text,
  created_at timestamptz not null default now(),
  primary key (profile_id, category_id)
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_profile_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  description text not null default '',
  category_id uuid references public.craft_categories (id) on delete set null,
  stage text not null default 'planned',
  visibility text not null default 'private',
  publication_status text not null default 'draft',
  location_label text,
  published_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint projects_owner_id_id_unique unique (owner_profile_id, id),
  constraint projects_title_length check (char_length(title) between 1 and 160),
  constraint projects_stage_check check (stage in ('planned', 'in_progress', 'completed')),
  constraint projects_visibility_check check (visibility in ('public', 'private', 'client_only')),
  constraint projects_publication_status_check
    check (publication_status in ('draft', 'published', 'archived')),
  constraint projects_publish_state_check
    check (publication_status <> 'published' or published_at is not null)
);

create table if not exists public.project_updates (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  author_profile_id uuid not null references public.profiles (id) on delete cascade,
  content text not null,
  visibility text not null default 'private',
  publication_status text not null default 'draft',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint project_updates_project_id_id_unique unique (project_id, id),
  constraint project_updates_content_length check (char_length(content) between 1 and 20000),
  constraint project_updates_visibility_check check (visibility in ('public', 'private', 'client_only')),
  constraint project_updates_publication_status_check
    check (publication_status in ('draft', 'published', 'archived')),
  constraint project_updates_publish_state_check
    check (publication_status <> 'published' or published_at is not null)
);

create table if not exists public.project_milestones (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'planned',
  visibility text not null default 'public',
  sort_order integer not null default 0,
  target_date date,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint project_milestones_title_length check (char_length(title) between 1 and 160),
  constraint project_milestones_status_check check (status in ('planned', 'in_progress', 'completed')),
  constraint project_milestones_visibility_check check (visibility in ('public', 'private', 'client_only'))
);

create table if not exists public.project_access_grants (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  grantee_profile_id uuid references public.profiles (id) on delete cascade,
  grant_type text not null,
  token_hash text unique,
  can_view_project boolean not null default true,
  can_view_updates boolean not null default true,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_by_profile_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint project_access_grants_type_check check (grant_type in ('account', 'link')),
  constraint project_access_grants_target_check check (
    (grant_type = 'account' and grantee_profile_id is not null and token_hash is null)
    or (grant_type = 'link' and grantee_profile_id is null and token_hash is not null)
  )
);

create table if not exists public.media_assets (
  id uuid primary key default gen_random_uuid(),
  owner_profile_id uuid not null references public.profiles (id) on delete cascade,
  project_id uuid not null,
  project_update_id uuid,
  bucket_id text not null default 'project-media',
  storage_path text not null unique,
  original_filename text not null,
  media_type text not null,
  mime_type text not null,
  file_size_bytes bigint not null,
  width integer,
  height integer,
  duration_seconds numeric(12, 3),
  caption text,
  alt_text text,
  comparison_role text not null default 'none',
  processing_status text not null default 'uploading',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint media_assets_project_owner_fkey
    foreign key (owner_profile_id, project_id)
    references public.projects (owner_profile_id, id) on delete cascade,
  constraint media_assets_update_project_fkey
    foreign key (project_id, project_update_id)
    references public.project_updates (project_id, id) on delete cascade,
  constraint media_assets_filename_length check (char_length(original_filename) between 1 and 255),
  constraint media_assets_type_check check (media_type in ('image', 'video', 'audio', 'document')),
  constraint media_assets_size_check check (file_size_bytes > 0),
  constraint media_assets_dimensions_check
    check ((width is null or width > 0) and (height is null or height > 0)),
  constraint media_assets_duration_check check (duration_seconds is null or duration_seconds > 0),
  constraint media_assets_comparison_role_check check (comparison_role in ('none', 'before', 'after')),
  constraint media_assets_processing_status_check
    check (processing_status in ('uploading', 'uploaded', 'processing', 'ready', 'failed', 'deleted')),
  constraint media_assets_bucket_check check (bucket_id = 'project-media')
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  conversation_type text not null,
  related_project_id uuid references public.projects (id) on delete set null,
  created_by_profile_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint conversations_type_check check (conversation_type in ('direct', 'inquiry'))
);

create table if not exists public.conversation_participants (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  last_read_at timestamptz,
  muted_at timestamptz,
  primary key (conversation_id, profile_id)
);

create table if not exists public.job_inquiries (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null unique references public.conversations (id) on delete cascade,
  customer_profile_id uuid not null references public.profiles (id) on delete cascade,
  artisan_profile_id uuid not null references public.profiles (id) on delete cascade,
  related_project_id uuid references public.projects (id) on delete set null,
  initial_message text not null,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint job_inquiries_distinct_participants
    check (customer_profile_id <> artisan_profile_id),
  constraint job_inquiries_message_length check (char_length(initial_message) between 1 and 10000),
  constraint job_inquiries_status_check check (status in ('open', 'responded', 'closed'))
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_profile_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  deleted_at timestamptz,
  constraint messages_body_length check (char_length(body) between 1 and 10000)
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_profile_id uuid not null references public.profiles (id) on delete cascade,
  notification_type text not null,
  resource_type text,
  resource_id uuid,
  safe_payload jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  constraint notifications_type_length check (char_length(notification_type) between 1 and 80)
);

create table if not exists public.notification_preferences (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  preferences jsonb not null default '{"in_app": true, "email": true}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.user_blocks (
  blocker_profile_id uuid not null references public.profiles (id) on delete cascade,
  blocked_profile_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_profile_id, blocked_profile_id),
  constraint user_blocks_not_self check (blocker_profile_id <> blocked_profile_id)
);

create table if not exists public.content_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_profile_id uuid not null references public.profiles (id) on delete cascade,
  target_profile_id uuid references public.profiles (id) on delete set null,
  target_project_id uuid references public.projects (id) on delete set null,
  target_message_id uuid references public.messages (id) on delete set null,
  reason text not null,
  details text,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  constraint content_reports_single_target check (
    num_nonnulls(target_profile_id, target_project_id, target_message_id) = 1
  ),
  constraint content_reports_reason_length check (char_length(reason) between 1 and 120),
  constraint content_reports_status_check check (status in ('open', 'reviewing', 'resolved', 'dismissed'))
);

create table if not exists public.moderation_actions (
  id uuid primary key default gen_random_uuid(),
  report_id uuid references public.content_reports (id) on delete set null,
  moderator_user_id uuid not null references auth.users (id) on delete restrict,
  target_profile_id uuid references public.profiles (id) on delete set null,
  action_type text not null,
  reason text not null,
  created_at timestamptz not null default now(),
  constraint moderation_actions_type_length check (char_length(action_type) between 1 and 80)
);

create table if not exists public.ai_tasks (
  id uuid primary key default gen_random_uuid(),
  requested_by_profile_id uuid not null references public.profiles (id) on delete cascade,
  project_id uuid references public.projects (id) on delete cascade,
  task_type text not null,
  status text not null default 'queued',
  input_media_ids uuid[] not null default '{}',
  draft_output jsonb,
  error_code text,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  constraint ai_tasks_type_check check (
    task_type in ('organize_media', 'draft_title', 'draft_description', 'suggest_stage', 'draft_update')
  ),
  constraint ai_tasks_status_check check (status in ('queued', 'processing', 'completed', 'failed', 'cancelled'))
);

-- Keep the migration safe to retry after partial deployment.
create index if not exists projects_owner_created_idx on public.projects (owner_profile_id, created_at desc);
create index if not exists projects_public_discovery_idx
  on public.projects (category_id, created_at desc)
  where visibility = 'public' and publication_status = 'published';
create index if not exists project_updates_timeline_idx on public.project_updates (project_id, created_at desc);
create index if not exists project_milestones_order_idx on public.project_milestones (project_id, sort_order, created_at);
create index if not exists project_access_grants_grantee_idx
  on public.project_access_grants (grantee_profile_id, project_id)
  where revoked_at is null;
create index if not exists media_assets_project_order_idx on public.media_assets (project_id, sort_order, created_at);
create index if not exists media_assets_update_idx on public.media_assets (project_update_id) where project_update_id is not null;
create index if not exists profile_services_category_idx on public.profile_services (category_id, profile_id);
create index if not exists profiles_public_location_idx on public.profiles (state, city) where is_public;
create index if not exists conversation_participants_profile_idx on public.conversation_participants (profile_id, conversation_id);
create index if not exists conversations_project_idx on public.conversations (related_project_id) where related_project_id is not null;
create index if not exists messages_conversation_created_idx on public.messages (conversation_id, created_at desc);
create index if not exists inquiries_artisan_created_idx on public.job_inquiries (artisan_profile_id, created_at desc);
create index if not exists inquiries_customer_created_idx on public.job_inquiries (customer_profile_id, created_at desc);
create index if not exists notifications_unread_idx
  on public.notifications (recipient_profile_id, created_at desc)
  where read_at is null;
create index if not exists content_reports_status_created_idx on public.content_reports (status, created_at);
create index if not exists ai_tasks_requester_created_idx on public.ai_tasks (requested_by_profile_id, created_at desc);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke execute on function public.touch_updated_at() from public, anon, authenticated;

create or replace function public.is_conversation_participant(p_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.conversation_participants cp
    where cp.conversation_id = p_conversation_id
      and cp.profile_id = (select auth.uid())
  );
$$;

revoke execute on function public.is_conversation_participant(uuid) from public, anon;
grant execute on function public.is_conversation_participant(uuid) to authenticated;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();
drop trigger if exists profile_contacts_touch_updated_at on public.profile_contacts;
create trigger profile_contacts_touch_updated_at
  before update on public.profile_contacts
  for each row execute function public.touch_updated_at();
drop trigger if exists projects_touch_updated_at on public.projects;
create trigger projects_touch_updated_at
  before update on public.projects
  for each row execute function public.touch_updated_at();
drop trigger if exists project_updates_touch_updated_at on public.project_updates;
create trigger project_updates_touch_updated_at
  before update on public.project_updates
  for each row execute function public.touch_updated_at();
drop trigger if exists project_milestones_touch_updated_at on public.project_milestones;
create trigger project_milestones_touch_updated_at
  before update on public.project_milestones
  for each row execute function public.touch_updated_at();
drop trigger if exists media_assets_touch_updated_at on public.media_assets;
create trigger media_assets_touch_updated_at
  before update on public.media_assets
  for each row execute function public.touch_updated_at();
drop trigger if exists conversations_touch_updated_at on public.conversations;
create trigger conversations_touch_updated_at
  before update on public.conversations
  for each row execute function public.touch_updated_at();
drop trigger if exists job_inquiries_touch_updated_at on public.job_inquiries;
create trigger job_inquiries_touch_updated_at
  before update on public.job_inquiries
  for each row execute function public.touch_updated_at();
drop trigger if exists notification_preferences_touch_updated_at on public.notification_preferences;
create trigger notification_preferences_touch_updated_at
  before update on public.notification_preferences
  for each row execute function public.touch_updated_at();

alter table public.profiles enable row level security;
alter table public.profile_contacts enable row level security;
alter table public.craft_categories enable row level security;
alter table public.profile_services enable row level security;
alter table public.projects enable row level security;
alter table public.project_updates enable row level security;
alter table public.project_milestones enable row level security;
alter table public.project_access_grants enable row level security;
alter table public.media_assets enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.job_inquiries enable row level security;
alter table public.messages enable row level security;
alter table public.notifications enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.user_blocks enable row level security;
alter table public.content_reports enable row level security;
alter table public.moderation_actions enable row level security;
alter table public.ai_tasks enable row level security;

drop policy if exists "Profiles are visible to their owner" on public.profiles;
create policy "Profiles are visible to their owner"
  on public.profiles for select to authenticated
  using ((select auth.uid()) = id);
drop policy if exists "Public profiles are visible" on public.profiles;
create policy "Public profiles are visible"
  on public.profiles for select to anon, authenticated
  using (is_public);
drop policy if exists "Profile owners can update their profile" on public.profiles;
create policy "Profile owners can update their profile"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

drop policy if exists "Profile owners manage contact details" on public.profile_contacts;
create policy "Profile owners manage contact details"
  on public.profile_contacts for all to authenticated
  using ((select auth.uid()) = profile_id)
  with check ((select auth.uid()) = profile_id);

drop policy if exists "Active craft categories are readable" on public.craft_categories;
create policy "Active craft categories are readable"
  on public.craft_categories for select to anon, authenticated
  using (is_active);

drop policy if exists "Profile services are visible to owners or public visitors" on public.profile_services;
create policy "Profile services are visible to owners or public visitors"
  on public.profile_services for select to anon, authenticated
  using (
    profile_id = (select auth.uid())
    or exists (
      select 1 from public.profiles p
      where p.id = profile_services.profile_id and p.is_public
    )
  );
drop policy if exists "Profile owners manage services" on public.profile_services;
create policy "Profile owners manage services"
  on public.profile_services for all to authenticated
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));

drop policy if exists "Project owners and authorized viewers can read projects" on public.projects;
create policy "Project owners and authorized viewers can read projects"
  on public.projects for select to anon, authenticated
  using (
    owner_profile_id = (select auth.uid())
    or (
      visibility = 'public'
      and publication_status = 'published'
      and exists (
        select 1 from public.profiles p
        where p.id = projects.owner_profile_id and p.is_public
      )
    )
    or exists (
      select 1 from public.project_access_grants g
      where g.project_id = projects.id
        and g.grantee_profile_id = (select auth.uid())
        and g.can_view_project
        and g.revoked_at is null
        and (g.expires_at is null or g.expires_at > now())
    )
  );
drop policy if exists "Project owners create projects" on public.projects;
create policy "Project owners create projects"
  on public.projects for insert to authenticated
  with check (owner_profile_id = (select auth.uid()));
drop policy if exists "Project owners update projects" on public.projects;
create policy "Project owners update projects"
  on public.projects for update to authenticated
  using (owner_profile_id = (select auth.uid()))
  with check (owner_profile_id = (select auth.uid()));
drop policy if exists "Project owners delete projects" on public.projects;
create policy "Project owners delete projects"
  on public.projects for delete to authenticated
  using (owner_profile_id = (select auth.uid()));

drop policy if exists "Visible project updates can be read" on public.project_updates;
create policy "Visible project updates can be read"
  on public.project_updates for select to anon, authenticated
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_updates.project_id
        and (
          p.owner_profile_id = (select auth.uid())
          or (
            p.visibility = 'public'
            and p.publication_status = 'published'
            and project_updates.visibility = 'public'
            and project_updates.publication_status = 'published'
          )
          or exists (
            select 1 from public.project_access_grants g
            where g.project_id = p.id
              and g.grantee_profile_id = (select auth.uid())
              and g.can_view_updates
              and g.revoked_at is null
              and (g.expires_at is null or g.expires_at > now())
              and (
                project_updates.visibility = 'public'
                or project_updates.visibility = 'client_only'
              )
          )
        )
    )
  );
drop policy if exists "Project owners create updates" on public.project_updates;
create policy "Project owners create updates"
  on public.project_updates for insert to authenticated
  with check (
    author_profile_id = (select auth.uid())
    and exists (
      select 1 from public.projects p
      where p.id = project_updates.project_id
        and p.owner_profile_id = (select auth.uid())
    )
  );
drop policy if exists "Project owners update updates" on public.project_updates;
create policy "Project owners update updates"
  on public.project_updates for update to authenticated
  using (author_profile_id = (select auth.uid()))
  with check (
    author_profile_id = (select auth.uid())
    and exists (
      select 1 from public.projects p
      where p.id = project_updates.project_id
        and p.owner_profile_id = (select auth.uid())
    )
  );
drop policy if exists "Project owners delete updates" on public.project_updates;
create policy "Project owners delete updates"
  on public.project_updates for delete to authenticated
  using (author_profile_id = (select auth.uid()));

drop policy if exists "Visible project milestones can be read" on public.project_milestones;
create policy "Visible project milestones can be read"
  on public.project_milestones for select to anon, authenticated
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_milestones.project_id
        and (
          p.owner_profile_id = (select auth.uid())
          or (
            p.visibility = 'public'
            and p.publication_status = 'published'
            and project_milestones.visibility = 'public'
          )
          or (
            project_milestones.visibility in ('public', 'client_only')
            and exists (
              select 1 from public.project_access_grants g
              where g.project_id = p.id
                and g.grantee_profile_id = (select auth.uid())
                and g.revoked_at is null
                and (g.expires_at is null or g.expires_at > now())
            )
          )
        )
    )
  );
drop policy if exists "Project owners manage milestones" on public.project_milestones;
create policy "Project owners manage milestones"
  on public.project_milestones for all to authenticated
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_milestones.project_id
        and p.owner_profile_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.projects p
      where p.id = project_milestones.project_id
        and p.owner_profile_id = (select auth.uid())
    )
  );

drop policy if exists "Project owners and grantees can read access grants" on public.project_access_grants;
create policy "Project owners and grantees can read access grants"
  on public.project_access_grants for select to authenticated
  using (
    created_by_profile_id = (select auth.uid())
    or grantee_profile_id = (select auth.uid())
  );
drop policy if exists "Project owners manage access grants" on public.project_access_grants;
create policy "Project owners manage access grants"
  on public.project_access_grants for all to authenticated
  using (created_by_profile_id = (select auth.uid()))
  with check (
    created_by_profile_id = (select auth.uid())
    and exists (
      select 1 from public.projects p
      where p.id = project_access_grants.project_id
        and p.owner_profile_id = (select auth.uid())
    )
  );

drop policy if exists "Visible media metadata can be read" on public.media_assets;
create policy "Visible media metadata can be read"
  on public.media_assets for select to anon, authenticated
  using (
    owner_profile_id = (select auth.uid())
    or exists (
      select 1 from public.projects p
      where p.id = media_assets.project_id
        and (
          (
            p.visibility = 'public'
            and p.publication_status = 'published'
            and media_assets.processing_status = 'ready'
            and exists (
              select 1 from public.profiles profile
              where profile.id = p.owner_profile_id and profile.is_public
            )
            and (
              media_assets.project_update_id is null
              or exists (
                select 1 from public.project_updates pu
                where pu.id = media_assets.project_update_id
                  and pu.project_id = media_assets.project_id
                  and pu.visibility = 'public'
                  and pu.publication_status = 'published'
              )
            )
          )
          or exists (
            select 1 from public.project_access_grants g
            where g.project_id = p.id
              and g.grantee_profile_id = (select auth.uid())
              and g.revoked_at is null
              and (g.expires_at is null or g.expires_at > now())
              and (
                media_assets.project_update_id is null
                or (
                  g.can_view_updates
                  and exists (
                    select 1 from public.project_updates pu
                    where pu.id = media_assets.project_update_id
                      and pu.project_id = media_assets.project_id
                      and pu.visibility in ('public', 'client_only')
                  )
                )
              )
          )
        )
    )
  );
drop policy if exists "Project owners manage media metadata" on public.media_assets;
create policy "Project owners manage media metadata"
  on public.media_assets for all to authenticated
  using (owner_profile_id = (select auth.uid()))
  with check (
    owner_profile_id = (select auth.uid())
    and exists (
      select 1 from public.projects p
      where p.id = media_assets.project_id
        and p.owner_profile_id = (select auth.uid())
    )
  );

drop policy if exists "Conversation participants can read conversations" on public.conversations;
create policy "Conversation participants can read conversations"
  on public.conversations for select to authenticated
  using (public.is_conversation_participant(id));
drop policy if exists "Conversation participants can read participant list" on public.conversation_participants;
create policy "Conversation participants can read participant list"
  on public.conversation_participants for select to authenticated
  using (public.is_conversation_participant(conversation_id));

drop policy if exists "Inquiry participants can read inquiries" on public.job_inquiries;
create policy "Inquiry participants can read inquiries"
  on public.job_inquiries for select to authenticated
  using (
    customer_profile_id = (select auth.uid())
    or artisan_profile_id = (select auth.uid())
  );
drop policy if exists "Customers can create inquiries to public profiles" on public.job_inquiries;
create policy "Customers can create inquiries to public profiles"
  on public.job_inquiries for insert to authenticated
  with check (
    customer_profile_id = (select auth.uid())
    and exists (
      select 1 from public.profiles p
      where p.id = job_inquiries.artisan_profile_id and p.is_public
    )
  );

drop policy if exists "Conversation participants can read messages" on public.messages;
create policy "Conversation participants can read messages"
  on public.messages for select to authenticated
  using (public.is_conversation_participant(conversation_id));
drop policy if exists "Participants can send messages as themselves" on public.messages;
create policy "Participants can send messages as themselves"
  on public.messages for insert to authenticated
  with check (
    sender_profile_id = (select auth.uid())
    and public.is_conversation_participant(conversation_id)
  );

drop policy if exists "Users can read their notifications" on public.notifications;
create policy "Users can read their notifications"
  on public.notifications for select to authenticated
  using (recipient_profile_id = (select auth.uid()));
drop policy if exists "Users can mark their notifications read" on public.notifications;
create policy "Users can mark their notifications read"
  on public.notifications for update to authenticated
  using (recipient_profile_id = (select auth.uid()))
  with check (recipient_profile_id = (select auth.uid()));

drop policy if exists "Users manage their notification preferences" on public.notification_preferences;
create policy "Users manage their notification preferences"
  on public.notification_preferences for all to authenticated
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));

drop policy if exists "Users can read their blocks" on public.user_blocks;
create policy "Users can read their blocks"
  on public.user_blocks for select to authenticated
  using (
    blocker_profile_id = (select auth.uid())
    or blocked_profile_id = (select auth.uid())
  );
drop policy if exists "Users create and remove their own blocks" on public.user_blocks;
create policy "Users create and remove their own blocks"
  on public.user_blocks for all to authenticated
  using (blocker_profile_id = (select auth.uid()))
  with check (blocker_profile_id = (select auth.uid()));

drop policy if exists "Reporters can read their reports" on public.content_reports;
create policy "Reporters can read their reports"
  on public.content_reports for select to authenticated
  using (reporter_profile_id = (select auth.uid()));
drop policy if exists "Users can file their own reports" on public.content_reports;
create policy "Users can file their own reports"
  on public.content_reports for insert to authenticated
  with check (reporter_profile_id = (select auth.uid()));

drop policy if exists "Users can read their AI tasks" on public.ai_tasks;
create policy "Users can read their AI tasks"
  on public.ai_tasks for select to authenticated
  using (requested_by_profile_id = (select auth.uid()));
drop policy if exists "Users can request AI tasks for their projects" on public.ai_tasks;
create policy "Users can request AI tasks for their projects"
  on public.ai_tasks for insert to authenticated
  with check (
    requested_by_profile_id = (select auth.uid())
    and (
      project_id is null
      or exists (
        select 1 from public.projects p
        where p.id = ai_tasks.project_id
          and p.owner_profile_id = (select auth.uid())
      )
    )
  );

grant select on public.profiles, public.craft_categories, public.profile_services,
  public.projects, public.project_updates, public.project_milestones, public.media_assets
  to anon, authenticated;
grant update on public.profiles to authenticated;
grant select, insert, update, delete on public.profile_contacts, public.profile_services,
  public.projects, public.project_updates, public.project_milestones,
  public.project_access_grants, public.media_assets, public.user_blocks,
  public.notification_preferences to authenticated;
grant select on public.project_access_grants, public.conversations,
  public.conversation_participants, public.job_inquiries, public.messages,
  public.notifications, public.content_reports, public.ai_tasks to authenticated;
grant insert on public.job_inquiries, public.messages, public.content_reports,
  public.ai_tasks to authenticated;
grant update (read_at) on public.notifications to authenticated;

insert into storage.buckets (id, name, public)
values ('project-media', 'project-media', false)
on conflict (id) do nothing;

drop policy if exists "Project media owner upload" on storage.objects;
create policy "Project media owner upload"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'project-media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
drop policy if exists "Project media owner read" on storage.objects;
create policy "Project media owner read"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'project-media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
drop policy if exists "Project media owner update" on storage.objects;
create policy "Project media owner update"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'project-media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'project-media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
drop policy if exists "Project media owner delete" on storage.objects;
create policy "Project media owner delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'project-media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
