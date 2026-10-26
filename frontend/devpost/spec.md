---
doc: spec
status: approved
---

# Decraft — Technical Spec

## How This Works, In Plain Language

The React app is the part people open in a browser. Public discovery currently uses sample artisans and projects. Account screens call the FastAPI auth endpoints, and signed-in makers see a project dashboard where each project opens into its own overview, progress log, and media space. Project records and selected media are still browser-session previews; they are not yet saved to the database or object storage.

The full PRD P0 remains the MVP; this is a staged build, not a claim that the preview implements project persistence, privacy enforcement, synchronization, or real messaging. Authentication uses Supabase through the API, subject to local configuration. The project-centered screens are designed for a maker to own multiple distinct projects.

## The Core Journey Through the System

1. A visitor lands on the responsive Decraft page, reads the product story and its how-it-works section, views a few featured projects, then signs in or creates an account to enter the application.
2. A maker signs in and sees a dashboard of their projects; creating another project does not replace existing work.
3. Each project opens at its own route with a distinct overview, progress history, and media section. The maker can add a description, stage, and local photo/video previews.
4. The app displays a review step before changing the local preview's publication status. Real project persistence and visibility enforcement remain backend work.
5. Signed-in users can browse the in-app project directory, maker profiles, and project details. Inquiry UI is a preview; real conversations, abuse checks, notifications, and public access controls need their API stages.
6. Later stages connect projects, uploads, access control, AI, discovery, messaging, notifications, and offline operations to FastAPI and managed services.

## Stack

- **Frontend:** [React](https://react.dev/), [TypeScript](https://www.typescriptlang.org/docs/), and [Vite](https://vite.dev/guide/), retaining the existing `frontend/app` scaffold as approved by the learner.
- **Routing:** [React Router](https://reactrouter.com/start/library/installation) for the landing page, authenticated in-app discovery, maker profiles/projects, authentication, maker dashboard, and per-project workspaces.
- **Styling:** responsive CSS in the existing app; add a shared token layer and reusable components as the design direction is settled.
- **Backend:** Python + [FastAPI](https://fastapi.tiangolo.com/); Supabase Auth routes are implemented for signup, login, session validation/refresh, and logout.
- **Persistence and services:** [PostgreSQL](https://www.postgresql.org/docs/) and [Supabase](https://supabase.com/docs) are planned for project data; private object storage is needed for media, and an AI provider must be selected before AI description drafting is implemented. Project APIs and those integrations remain outstanding.
- **First-slice sample data:** TypeScript fixtures and browser-only prototype state. It must be identified as sample/simulated behavior and must not be used for real private or client data.

## Where It Runs and How Someone Tries It

- Run from `frontend/app` with `npm run dev`.
- Open the local URL printed by Vite in the browser.
- Build check: `npm run build`.
- Lint check: `npm run lint`.
- Run the backend from `backend` as described in its README and configure Supabase before testing signup or login; frontend Vite proxies `/api` to `127.0.0.1:8000`.
- Public sample browsing and the landing pages do not require Supabase. Account and project-workspace access require the API; project data currently resets with the browser session.

## Look and Feel

The landing page is a product pitch, not a generic SaaS hero: it tells the story from scattered work examples, through a how-it-works section on the same page, and includes a small featured-work preview. Discovery, maker profiles, and project details live inside the signed-in application under `/app`; visitors must authenticate before entering them. Signed-in navigation keeps Find work available alongside the maker's projects. The workspace is project-centered: multiple project records per account, each with a distinct home and history. The project-folio direction is selected, and all pages must work on mobile and larger screens.

## Components

### Landing and public entry

Explains the product story and directs customers toward discovery and artisans toward profile/project creation.
Implements `prd.md > Landing page and navigation`.

### Discovery and artisan profiles

Shows eligible profiles and projects, with location and service filters; presents public portfolio information and contact options.
Implements `prd.md > Discovery, contact, and messaging`.

### Project workspace and timeline

Creates and updates structured projects, stages, milestones, and progress entries; gives every project its own route and overview; distinguishes draft from preview-published content.
Implements `prd.md > Projects, timelines, and media`.

### Media management

Selects photo and video files for project previews. Upload processing and private storage are not yet connected.
Implements `prd.md > Projects, timelines, and media` and `prd.md > Visibility and client access`.

### AI review and publishing

The interface leaves manual descriptions available and marks Decraft AI drafting as unavailable until a provider and API are implemented. Any future AI suggestion must remain editable and require artisan approval.
Implements `prd.md > AI-assisted project organization`.

### Authentication and profiles

Supports account recovery, verification, individual/workshop/business profile setup, and profile editing.
Implements `prd.md > Accounts and profiles`.

### Privacy and client access

Represents public, private, and client-only visibility and client grants. The backend—not the UI—will enforce access and revocation.
Implements `prd.md > Visibility and client access`.

### Messaging, inquiries, notifications, and safety

Supports text conversations and inquiries, essential alerts, user blocking/reporting, and manual moderation support.
Implements `prd.md > Discovery, contact, and messaging` and `prd.md > Notifications and safety`.

### Offline drafts

Stores draft work locally, shows sync status, and synchronizes without silently overwriting content or publishing it.
Implements `prd.md > Offline drafts and synchronization`.

## Data Model

The interface-facing records follow the source PRD:

- **Profile:** type, display name, description, location, crafts/services, contact preferences, optional availability and price range.
- **Project:** owning profile, title, description, category, stage, visibility, timestamps, milestones, and publication state.
- **Project update:** project reference, text, timestamp, and visibility/publication state.
- **Media:** project/update reference, type, storage reference, processing state, and access policy.
- **Client access grant:** project, authorized customer or link, permissions, expiry/revocation state.
- **Inquiry/conversation/message:** participants, related profile or project, message text, and timestamps.
- **Notification/report/block:** recipient or actors, target, state, and timestamps.

Public sample records live in `src/data/`. Authenticated project records and media selections are held only in browser memory for the current preview session; they disappear on reload and are not a secure storage mechanism. Do not use this preview for sensitive real project data. Durable project data belongs in the server database and media bytes in private object storage. Offline draft storage and synchronization remain later, explicit features.

## File Structure

```text
frontend/
├── PRODUCT.md
├── devpost/                       # Approved product plan and build tracking
├── .github/skills/impeccable/     # Installed Impeccable skill
└── app/
    ├── package.json
    ├── index.html
    └── src/
        ├── main.tsx               # App entry
        ├── App.tsx                # Route setup
        ├── pages/                 # Landing, discovery, public profiles, projects, workspace
        ├── components/            # Shared navigation, media, project, and form UI
        ├── data/                  # Clearly labeled sample fixtures
        ├── services/              # Data-access interface; sample implementation first, API later
        ├── types/                 # Profile, project, media, and conversation shapes
        ├── styles/                # Responsive tokens and shared styles
        └── assets/                # App-owned static imagery and icons
```

The file structure is a target for staged work; create only files needed by each approved slice.

## External Services and Dependencies

### Current frontend

- Existing React, React DOM, TypeScript, and Vite dependencies.
- React Router for public and protected route structure.
- Vite proxies `/api` requests to the local FastAPI service.
- Auth UI uses the FastAPI `/api/v1/auth` endpoints; local Supabase configuration is required for a real signup/login flow.
- Public discovery uses sample data; project forms support local photo/video previews but do not upload files.

### Later full MVP stages

- FastAPI REST API, following the endpoint patterns in `SOLUTION_APPROACH.md`.
- Supabase Auth and PostgreSQL/Supabase-hosted database, as proposed in the solution approach.
- Private object storage for media.
- Background processing for AI/media work only when required by measured task latency.
- Provider-independent AI integration; provider, keys, limits, and cost must be resolved before that stage.
- API and external-service contracts must be documented with actual endpoints and configured limits before integration; none are currently implemented in the backend.

## Important Failure Modes

- **API not available during frontend work** → the approved first slice uses labeled fixtures; it must not report sample actions as persisted or securely published.
- **AI or upload processing fails in later stages** → preserve the artisan's manual workflow and show a clear retry/error state; AI is never required to create or publish a project.
- **Connectivity is interrupted in later stages** → retain a draft, show whether it is local or synchronized, and never publish on synchronization alone.
- **An unauthorized user requests private media or client-only work** → the backend denies access, including direct media requests; frontend hiding is not a security boundary.

## What Was Simplified and Why

- **Public sample data remains separate from account projects** — sample profiles are not presented as user-owned or independently verified.
- **Project edits remain in-memory previews** until project APIs and storage are implemented; the UI must not suggest those edits are durable or publicly accessible.
- **No live AI, realtime messaging, or offline sync yet** — each depends on services not implemented and will be built in later, separately verified stages.

## Decisions and Open Issues

- **Learner choice:** retain the existing React + TypeScript + Vite app rather than migrate to Next.js. This avoids replacing the current scaffold; server-rendered SEO for public portfolios is not yet established as a requirement.
- **Learner choice:** use sample data for public discovery and connect account screens to FastAPI/Supabase Auth.
- **Learner choice:** deliver the full P0 set as a staged MVP.
- **Learner choice:** keep How it works as a section of the landing page, not a separate page; use capitalized Decraft wordmark.
- **Learner choice:** one maker can own multiple projects, with a dedicated space for each; take structural inspiration from GitHub without copying code-specific UI.
- **Impeccable direction:** project folio.
- **Open:** choose the AI provider and implement real media/project persistence before enabling AI or upload actions.
- **Useful learner uncertainty:** none has been identified yet; no unfamiliar technical concept was raised during this planning conversation.
- **Open:** confirm the React Router dependency and any external image assets during the first implementation slice; do not assume external APIs or credentials.
