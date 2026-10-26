import unittest
from types import SimpleNamespace

from fastapi.testclient import TestClient
from pydantic import SecretStr

from backend.api.dependencies.supabase import get_supabase_client
from backend.application import create_app
from backend.core.config import Settings


class FakeAuth:
    def __init__(self) -> None:
        self.signup_credentials: dict[str, object] | None = None
        self.signup_returns_session = True
        self.login_credentials: dict[str, object] | None = None
        self.signed_out = False
        self.current_user = SimpleNamespace(
            id="maker-1",
            email="maker@example.com",
            user_metadata={"display_name": "Metadata Name", "profile_type": "individual"},
        )

    def sign_up(self, credentials: dict[str, object]) -> SimpleNamespace:
        self.signup_credentials = credentials
        user = SimpleNamespace(
            id="maker-1",
            email="maker@example.com",
            user_metadata={
                "display_name": credentials["options"]["data"]["display_name"],
                "profile_type": credentials["options"]["data"]["profile_type"],
            },
        )
        session = SimpleNamespace(
            access_token="signup-access-token",
            refresh_token="signup-refresh-token",
            expires_in=3600,
        )
        return SimpleNamespace(user=user, session=session if self.signup_returns_session else None)

    def sign_in_with_password(self, credentials: dict[str, object]) -> SimpleNamespace:
        self.login_credentials = credentials
        user = SimpleNamespace(
            id="maker-1",
            email="maker@example.com",
            user_metadata={"display_name": "A Maker", "profile_type": "individual"},
        )
        session = SimpleNamespace(
            access_token="access-token",
            refresh_token="refresh-token",
            expires_in=3600,
        )
        return SimpleNamespace(user=user, session=session)

    def set_session(self, access_token: str, refresh_token: str) -> None:
        self.session_tokens = (access_token, refresh_token)

    def sign_out(self) -> None:
        self.signed_out = True


class FakeProfileQuery:
    def __init__(self) -> None:
        self.profile_id: str | None = None

    def select(self, columns: str) -> FakeProfileQuery:
        self.columns = columns
        return self

    def eq(self, column: str, value: str) -> FakeProfileQuery:
        self.profile_id = value
        return self

    def single(self) -> FakeProfileQuery:
        return self

    def execute(self) -> SimpleNamespace:
        return SimpleNamespace(
            data={
                "display_name": "Database Name",
                "profile_type": "workshop",
            }
        )


class FakePostgrest:
    def __init__(self) -> None:
        self.token: str | None = None

    def auth(self, token: str) -> None:
        self.token = token


class AuthApiTests(unittest.TestCase):
    def setUp(self) -> None:
        self.auth = FakeAuth()
        self.profile_query = FakeProfileQuery()
        self.postgrest = FakePostgrest()
        self.client = SimpleNamespace(
            auth=self.auth,
            postgrest=self.postgrest,
            table=lambda table_name: self.profile_query,
        )
        settings = Settings(
            supabase_url="https://example.supabase.co",
            supabase_anon_key=SecretStr("public-anon-key"),
        )
        self.app = create_app(settings)
        self.app.dependency_overrides[get_supabase_client] = lambda: self.client
        self.http = TestClient(self.app)

    def tearDown(self) -> None:
        self.http.close()

    def test_health_endpoint_is_available_without_supabase(self) -> None:
        with TestClient(create_app(Settings(_env_file=None))) as http:
            response = http.get("/health")
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.json(), {"status": "ok"})

    def test_signup_sends_profile_metadata_and_starts_session(self) -> None:
        response = self.http.post(
            "/api/v1/auth/signup",
            json={
                "display_name": "  A Maker  ",
                "email": "maker@example.com",
                "password": "secure-password",
                "profile_type": "workshop",
            },
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(self.auth.signup_credentials["options"]["data"], {
            "display_name": "A Maker",
            "profile_type": "workshop",
        })
        self.assertEqual(response.json()["user"]["profile"]["profile_type"], "workshop")
        self.assertIn("decraft_access=signup-access-token", response.headers["set-cookie"])
        self.assertNotIn("confirmation", response.text.lower())

    def test_signup_without_a_session_returns_explicit_service_error(self) -> None:
        self.auth.signup_returns_session = False
        response = self.http.post(
            "/api/v1/auth/signup",
            json={
                "display_name": "A Maker",
                "email": "maker@example.com",
                "password": "secure-password",
                "profile_type": "individual",
            },
        )
        self.assertEqual(response.status_code, 503)
        self.assertEqual(
            response.json()["detail"],
            "Your account was created, but we couldn't sign you in. Please try signing in.",
        )
        self.assertNotIn("decraft_access=", response.headers.get("set-cookie", ""))

    def test_login_returns_user_and_sets_http_only_session_cookies(self) -> None:
        response = self.http.post(
            "/api/v1/auth/login",
            json={"email": "maker@example.com", "password": "secure-password"},
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["user"]["id"], "maker-1")
        self.assertEqual(response.json()["user"]["profile"]["display_name"], "A Maker")
        self.assertNotIn("access-token", response.text)
        self.assertIn("decraft_access=access-token", response.headers["set-cookie"])
        self.assertIn("httponly", response.headers["set-cookie"].lower())
        self.assertIn("path=/api/v1;", response.headers["set-cookie"].lower())
        cookie_headers = response.headers["set-cookie"].lower()
        self.assertIn("max-age=0", cookie_headers)
        self.assertIn("path=/api/v1/auth", cookie_headers)

    def test_cross_site_production_cookies_are_secure_and_compatible(self) -> None:
        settings = Settings(
            supabase_url="https://example.supabase.co",
            supabase_anon_key=SecretStr("public-anon-key"),
            auth_cookie_secure=True,
            auth_cookie_samesite="none",
        )
        app = create_app(settings)
        app.dependency_overrides[get_supabase_client] = lambda: self.client
        with TestClient(app) as http:
            response = http.post(
                "/api/v1/auth/login",
                json={"email": "maker@example.com", "password": "secure-password"},
            )
        cookie_headers = response.headers.get_list("set-cookie")
        self.assertTrue(cookie_headers)
        self.assertTrue(all("samesite=none" in cookie.lower() for cookie in cookie_headers))
        self.assertTrue(all("secure" in cookie.lower() for cookie in cookie_headers))
        self.assertTrue(all("httponly" in cookie.lower() for cookie in cookie_headers))

    def test_cors_allows_configured_frontend_with_credentials(self) -> None:
        response = self.http.options(
            "/api/v1/auth/login",
            headers={
                "Origin": "http://localhost:5173",
                "Access-Control-Request-Method": "POST",
            },
        )
        self.assertEqual(response.headers["access-control-allow-origin"], "http://localhost:5173")
        self.assertEqual(response.headers["access-control-allow-credentials"], "true")

    def test_missing_supabase_configuration_returns_service_unavailable(self) -> None:
        app = create_app(Settings(_env_file=None))
        with TestClient(app) as http:
            response = http.post(
                "/api/v1/auth/signup",
                json={
                    "display_name": "A Maker",
                    "email": "maker@example.com",
                    "password": "secure-password",
                    "profile_type": "individual",
                },
            )
            self.assertEqual(response.status_code, 503)
            self.assertEqual(
                response.json()["detail"],
                "The account service is temporarily unavailable. Please try again later.",
            )

    def test_me_requires_a_session(self) -> None:
        response = self.http.get("/api/v1/auth/me")
        self.assertEqual(response.status_code, 401)

    def test_me_loads_profile_through_supabase_sdk_with_user_token(self) -> None:
        self.auth.get_user = lambda token: SimpleNamespace(user=self.auth.current_user)
        self.http.cookies.set("decraft_access", "owner-access-token")
        response = self.http.get("/api/v1/auth/me")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(self.profile_query.profile_id, "maker-1")
        self.assertEqual(self.postgrest.token, "owner-access-token")
        self.assertEqual(response.json()["user"]["profile"]["display_name"], "Database Name")
        self.assertEqual(response.json()["user"]["profile"]["profile_type"], "workshop")

    def test_openapi_includes_all_auth_routes(self) -> None:
        response = self.http.get("/openapi.json")
        self.assertEqual(response.status_code, 200)
        self.assertIn("/api/v1/auth/logout", response.json()["paths"])


if __name__ == "__main__":
    unittest.main()
