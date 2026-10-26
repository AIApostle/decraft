# Decraft API

The FastAPI service uses the official `supabase-py` client for Supabase Auth and database API calls. Supabase issues session tokens; the API stores them in `HttpOnly` cookies and exposes only the authenticated user and profile summary to the browser. No service-role key is required by these auth endpoints.

## Structure

- `main.py` at the backend root is the ASGI entry point (`main:app`).
- `src/backend/application.py` creates the FastAPI app and registers middleware and routes.
- `src/backend/api/` contains HTTP routes, request dependencies, and cookie handling.
- `src/backend/core/` contains application configuration.
- `src/backend/schemas/` contains validated request and response models.
- `src/backend/services/` contains authentication operations and response mapping.
- `src/backend/infrastructure/supabase/` creates SDK clients.
- `src/backend/repositories/` contains database access through the SDK.
- `supabase/migrations/` contains database schema and RLS changes.

The Python SDK is used for runtime Auth and PostgREST interactions. Database tables, triggers, and RLS policies are versioned as SQL migrations; the SDK is not a schema-migration tool.

## Configure

1. Copy `.env.example` to `.env`.
2. Set `SUPABASE_URL` and `SUPABASE_ANON_KEY` from the Supabase project. Backend settings load `backend/.env` using its absolute project path, independent of the directory used to launch the service; environment variables set by the host take precedence.
3. Keep Supabase Auth's `mailer_autoconfirm` option set to `true` while developing. This turns email verification off, avoids confirmation email rate limits, and lets signup return a session.
4. Apply the ordered migrations in `supabase/migrations/` with the Supabase CLI (`supabase db push`). They create profiles, project/media and discovery tables, RLS policies, the private `project-media` and `profile-avatars` buckets, and public share slugs.
5. For local development, use `AUTH_COOKIE_SECURE=false` and `AUTH_COOKIE_SAMESITE=lax`. For production on Vercel and Render, configure the Render environment with `FRONTEND_ORIGINS=https://decraft.vercel.app`, `AUTH_COOKIE_SECURE=true`, and `AUTH_COOKIE_SAMESITE=none`. The frontend production build defaults to `https://decraft.onrender.com`; set `VITE_API_BASE_URL` in Vercel only if the API is hosted elsewhere. The production domains are cross-site, so credentialed CORS and secure `SameSite=None` cookies are required.

`FRONTEND_ORIGINS` is an exact comma-separated origin allowlist (scheme, host, and optional port). CORS handles browser preflights and response headers; origin middleware rejects requests and preflights that supply an unapproved `Origin`. Requests without an `Origin` remain available for health checks and non-browser clients, so this is not a replacement for authentication or authorization.

The backend supports Python 3.11 and newer. Render is configured to use its latest available Python 3.11 patch release via `.python-version`; omitting the patch version avoids pinning to a patch runtime that Render cannot provision.

## Run

From this directory:

```sh
uv sync
uv run backend
```

The API listens on `http://127.0.0.1:8000`; `/health` is a public health check. To run through Uvicorn directly, use `uv run uvicorn main:app --host 127.0.0.1 --port 8000` from this directory. The frontend Vite server proxies `/api` to this service by default. Set `VITE_API_PROXY_TARGET` in `frontend/app/.env.local` if the local API listens elsewhere. The Vercel SPA rewrite supports direct profile and project share URLs. Before relying on production, apply all migrations in `supabase/migrations/` to the intended Supabase project and verify the Render health endpoint and storage configuration.

Public share routes are `/@{profile-username}` and `/@{profile-username}/{project-slug}`. Public lookups return only public profiles and published public projects.

Profile photos are limited to JPEG or PNG files up to 5 MiB. The authenticated API stores them in the private `profile-avatars` bucket and returns short-lived signed URLs; the service-role key is only used by the backend. Apply the avatar storage migration before enabling uploads in a deployed environment.

## Auth endpoints

- `POST /api/v1/auth/signup` creates a Supabase Auth user with display-name/profile-type metadata and starts a cookie-backed session when Supabase returns one.
- `POST /api/v1/auth/login` sets the secure session cookies after Supabase authenticates the account.
- `GET /api/v1/auth/me` validates or refreshes the cookie session.
- `POST /api/v1/auth/logout` revokes the Supabase session and clears the cookies.

The client never receives access or refresh tokens in JSON. Do not add a service-role key to frontend configuration.

## Verification

Run the backend tests with `uv run python -m unittest discover -s tests`.

The SDK usage follows the official [Python client initialization](https://supabase.com/docs/reference/python/initializing), [sign-up](https://supabase.com/docs/reference/python/auth-signup), [user lookup](https://supabase.com/docs/reference/python/auth-getuser), [select](https://supabase.com/docs/reference/python/select), [single-row query](https://supabase.com/docs/reference/python/single), and [insert](https://supabase.com/docs/reference/python/insert) references.