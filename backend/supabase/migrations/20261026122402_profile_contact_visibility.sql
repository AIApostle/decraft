alter table public.profile_contacts
  add column if not exists email text,
  add column if not exists show_on_profile boolean not null default false;

alter table public.profile_contacts
  drop constraint if exists profile_contacts_email_length;

alter table public.profile_contacts
  add constraint profile_contacts_email_length
    check (email is null or char_length(email) between 3 and 254);

alter table public.projects
  add column if not exists include_contact boolean not null default false;

create index if not exists projects_public_contact_owner_idx
  on public.projects (owner_profile_id)
  where include_contact
    and visibility = 'public'
    and publication_status = 'published';

drop policy if exists "Public profile contacts visible when enabled" on public.profile_contacts;
create policy "Public profile contacts visible when enabled"
  on public.profile_contacts for select to anon, authenticated
  using (
    exists (
      select 1
      from public.profiles profile
      where profile.id = profile_contacts.profile_id
        and profile.is_public
    )
    and (
      show_on_profile
      or exists (
        select 1
        from public.projects project
        where project.owner_profile_id = profile_contacts.profile_id
          and project.include_contact
          and project.visibility = 'public'
          and project.publication_status = 'published'
      )
    )
  );

grant select on public.profile_contacts to anon, authenticated;

insert into storage.buckets (id, name, public)
values ('project-media', 'project-media', false)
on conflict (id) do update
set public = false;