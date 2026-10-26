---
doc: spec
status: approved
---

# Decraft — Technical Spec

## How This Works, In Plain Language

The React app is the part people open in a browser. The landing page uses sample artisans and projects; authenticated project management calls the FastAPI API. Makers can manage projects, add dated progress updates, upload media, and control project visibility and publishing through those APIs. Published public profiles and projects also have shareable routes. Durable use depends on the matching migrations being applied to the connected Supabase project and its storage being configured.

The full PRD P0 remains the MVP and is being delivered in stages. Authentication, project and media APIs, and project visibility controls are implemented; AI-assisted writing, offline synchronization, and real-time messaging are not yet complete. Authentication and persistence require the corresponding Supabase configuration and deployed database migrations. The project-centered screens are designed for a maker to own multiple distinct projects.

## The Core Journey Through the System

1. A visitor lands on the responsive Decraft page, reads the product story and its how-it-works section, views a few featured projects, then signs in or creates an account to enter the application.
2. A maker signs in and sees a dashboard of their projects; creating another project does not replace existing work.
3. Each project opens at its own route with a distinct overview, progress history, and media section. Updates are grouped by the viewer's local calendar day, with a local time shown for each update. Makers can add dated updates and upload photos or videos through the API.
4. Makers choose whether a project is private or public, then explicitly publish it. Project and media persistence use the backend and Supabase; the target database migrations and storage configuration must be deployed for those flows to work.
5. Signed-in users can browse the in-app project directory. Anyone with a share link can open a public maker profile at `/@username` or a published public project at `/@username/project-slug`. Inquiry UI is a preview; real conversations, abuse checks, and notifications remain future work.
6. Later stages complete AI assistance, messaging, notifications, and offline operations using FastAPI and managed services.

## Stack

- **Frontend:** [React](https://react.dev/), [TypeScript](https://www.typescriptlang.org/docs/), and [Vite](https://vite.dev/guide/), retaining the existing `frontend/app` scaffold as approved by the learner.
- **Routing:** [React Router](https://reactrouter.com/start/library/installation) for the landing page, public share routes, authenticated in-app discovery, maker profiles/projects, authentication, maker dashboard, and per-project workspaces.
- **Styling:** responsive CSS in the existing app; add a shared token layer and reusable components as the design direction is settled.
- **Backend:** Python 3.11+ + [FastAPI](https://fastapi.tiangolo.com/); Supabase Auth routes are implemented for signup, login, session validation/refresh, and logout.
- **Persistence and services:** [PostgreSQL](https://www.postgresql.org/docs/) and [Supabase](https://supabase.com/docs) back the project APIs and private media storage. The migrations are in `backend/supabase/migrations/` and must be applied to the target Supabase project. An AI provider must be selected before AI description drafting is implemented.
- **First-slice sample data:** TypeScript fixtures and browser-only prototype state. It must be identified as sample/simulated behavior and must not be used for real private or client data.

## Where It Runs and How Someone Tries It

- Run from `frontend/app` with `npm run dev`.
- Open the local URL printed by Vite in the browser.
- Build check: `npm run build`.
- Lint check: `npm run lint`.
- Run the backend from `backend` as described in its README and configure Supabase before testing signup or login; frontend Vite proxies `/api` to `127.0.0.1:8000`.
- Production frontend: `https://decraft.vercel.app`. Production API: `https://decraft.onrender.com`. The frontend defaults to this API in production; Render must allow the exact Vercel origin and use secure `SameSite=None` auth cookies.
- Direct public share routes are served through the Vercel SPA rewrite. The share-slug migration has been prepared but its application to the production Supabase project is not verified.
- Public sample browsing and the landing pages do not require Supabase. Account, project, and public share-route data use the API and Supabase.

## Look and Feel

The landing page is a product pitch, not a generic SaaS hero: it tells the story from scattered work examples, through a how-it-works section on the same page, and includes a small featured-work preview. Discovery and project management require an account; published public profile and project share pages do not. Signed-in navigation keeps Find work available alongside the maker's projects. The workspace is project-centered: multiple project records per account, each with a distinct home and history. The project-folio direction is selected, and all pages must work on mobile and larger screens.

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

Uploads photos and videos through the backend to private Supabase storage, then serves visible media through signed URLs.
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

Landing-page sample records live in `frontend/app/src/data/`. Authenticated project records and progress updates are managed by the FastAPI API and stored in Supabase; uploaded media is stored in private object storage and served through signed URLs. Confirm that the project migrations and storage configuration are deployed before relying on persistence in an environment. Offline draft storage and synchronization remain later, explicit features.

## File Structure

```text
decraft/
├── PRD.md                         # Product requirements source of truth
├── SOLUTION_APPROACH.md           # Technical approach
├── devpost/                       # Planning and build-learning workspace
│   ├── learner-profile.md
│   ├── scope.md
│   ├── prd.md
│   └── spec.md
├── backend/
│   ├── src/backend/               # FastAPI application
│   ├── supabase/migrations/       # Database schema and functions
│   └── tests/
└── frontend/
    ├── PRODUCT.md
    ├── skills-lock.json
    └── app/                       # React + TypeScript + Vite application
```

The file structure is a target for staged work; create only files needed by each approved slice.

## External Services and Dependencies

### Current frontend

- Existing React, React DOM, TypeScript, and Vite dependencies.
- React Router for public and protected route structure.
- Vite proxies `/api` requests to the local FastAPI service.
- Auth UI uses the FastAPI `/api/v1/auth` endpoints; local Supabase configuration is required for a real signup/login flow.
- The landing page uses sample data; authenticated discovery and project screens use the backend API.
- Project media uploads require a reachable backend, configured Supabase storage, and the database migrations deployed to that Supabase project.

### Later full MVP stages

- Complete the FastAPI REST API for the remaining P0 features, following `SOLUTION_APPROACH.md`.
- Supabase Auth and PostgreSQL/Supabase-hosted database, with project and media persistence already implemented.
- Private object storage for media, with signed URLs for allowed viewers.
- Background processing for AI/media work only when required by measured task latency.
- Provider-independent AI integration; provider, keys, limits, and cost must be resolved before that stage.
- API and external-service contracts for the remaining P0 features must be documented before integration.

## Important Failure Modes

- **API not available** → show a clear request error; never report sample actions as persisted or securely published.
- **AI or upload processing fails in later stages** → preserve the artisan's manual workflow and show a clear retry/error state; AI is never required to create or publish a project.
- **Connectivity is interrupted in later stages** → retain a draft, show whether it is local or synchronized, and never publish on synchronization alone.
- **An unauthorized user requests private media or client-only work** → the backend denies access, including direct media requests; frontend hiding is not a security boundary.

## What Was Simplified and Why

- **Public sample data remains separate from account projects** — sample profiles are not presented as user-owned or independently verified.
- **Schema or storage deployment is missing** → project or upload requests can fail even when the frontend and backend are running; verify Supabase migrations and bucket configuration before treating the feature as production-ready.
- **No live AI, realtime messaging, or offline sync yet** — each depends on services not implemented and will be built in later, separately verified stages.

## Decisions and Open Issues

- **Learner choice:** retain the existing React + TypeScript + Vite app rather than migrate to Next.js. This avoids replacing the current scaffold; server-rendered SEO for public portfolios is not yet established as a requirement.
- **Learner choice:** use sample data for public discovery and connect account screens to FastAPI/Supabase Auth.
- **Learner choice:** deliver the full P0 set as a staged MVP.
- **Learner choice:** keep How it works as a section of the landing page, not a separate page; use capitalized Decraft wordmark.
- **Learner choice:** one maker can own multiple projects, with a dedicated space for each; take structural inspiration from GitHub without copying code-specific UI.
- **Impeccable direction:** project folio.
- **Open:** choose and integrate an AI provider; complete messaging, notifications, and offline synchronization.
- **Deployment check:** apply and verify the project/share-link migrations and storage bucket configuration on each target Supabase environment. The Supabase MCP and CLI were unavailable in the current workspace session, so no remote migration execution is confirmed.
- **Deployment check:** verify `https://decraft.onrender.com/health`; the previous request timed out, so API availability remains unconfirmed.
- **Useful learner uncertainty:** none has been identified yet; no unfamiliar technical concept was raised during this planning conversation.
- **Open:** confirm the React Router dependency and any external image assets during the first implementation slice; do not assume external APIs or credentials.
