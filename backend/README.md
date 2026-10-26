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
4. Apply the ordered migrations in `supabase/migrations/` with the Supabase CLI (`supabase db push`). The first creates one profile per Auth user; the second adds project, media, discovery, and collaboration tables, RLS policies, and the private `project-media` bucket.
5. For local development, leave `AUTH_COOKIE_SECURE=false` and `AUTH_COOKIE_SAMESITE=lax`. For a production same-origin reverse proxy, set `AUTH_COOKIE_SECURE=true`, keep `AUTH_COOKIE_SAMESITE=lax`, and leave `VITE_API_BASE_URL` empty. If the frontend and API use different sites, set `VITE_API_BASE_URL` to the API origin, add the exact frontend origin to `FRONTEND_ORIGINS`, and set `AUTH_COOKIE_SECURE=true` and `AUTH_COOKIE_SAMESITE=none`.

## Run

From this directory:

```sh
uv sync
uv run backend
```

The API listens on `http://127.0.0.1:8000`; `/health` is a public health check. To run through Uvicorn directly, use `uv run uvicorn main:app --host 127.0.0.1 --port 8000` from this directory. The frontend Vite server proxies `/api` to this service by default. Set `VITE_API_PROXY_TARGET` in `frontend/app/.env.local` if the local API listens elsewhere. In production, provide Supabase settings through the host environment and either proxy `/api` to FastAPI from the frontend origin or set the frontend build variable `VITE_API_BASE_URL` to the separate API origin.

## Auth endpoints

- `POST /api/v1/auth/signup` creates a Supabase Auth user with display-name/profile-type metadata and starts a cookie-backed session when Supabase returns one.
- `POST /api/v1/auth/login` sets the secure session cookies after Supabase authenticates the account.
- `GET /api/v1/auth/me` validates or refreshes the cookie session.
- `POST /api/v1/auth/logout` revokes the Supabase session and clears the cookies.

The client never receives access or refresh tokens in JSON. Do not add a service-role key to frontend configuration.

## Verification

Run the backend tests with `uv run python -m unittest discover -s tests`.

The SDK usage follows the official [Python client initialization](https://supabase.com/docs/reference/python/initializing), [sign-up](https://supabase.com/docs/reference/python/auth-signup), [user lookup](https://supabase.com/docs/reference/python/auth-getuser), [select](https://supabase.com/docs/reference/python/select), [single-row query](https://supabase.com/docs/reference/python/single), and [insert](https://supabase.com/docs/reference/python/insert) references.