from unittest.mock import Mock

import pytest

from backend.core.config import Settings
from backend.services import profile_avatar


def test_upload_stores_validated_avatar_under_random_owner_path(monkeypatch: pytest.MonkeyPatch) -> None:
    storage_client = Mock()
    monkeypatch.setattr(profile_avatar, "_storage_client", lambda _settings: storage_client)

    storage_path = profile_avatar.upload_profile_avatar(
        Settings(_env_file=None),
        "profile-123",
        "image/png",
        b"\x89PNG\r\n\x1a\nimage-data",
    )

    assert storage_path.startswith("profile-123/")
    assert storage_path.endswith(".png")
    storage_client.storage.from_.assert_called_once_with("profile-avatars")
    storage_client.storage.from_.return_value.upload.assert_called_once_with(
        storage_path,
        b"\x89PNG\r\n\x1a\nimage-data",
        {"content-type": "image/png", "cache-control": "3600"},
    )


@pytest.mark.parametrize(
    ("content_type", "content"),
    [
        ("image/jpeg", b"\x89PNG\r\n\x1a\nimage-data"),
        ("image/png", b"not-an-image"),
        ("image/gif", b"GIF89a"),
    ],
)
def test_upload_rejects_unsupported_or_mismatched_images(
    monkeypatch: pytest.MonkeyPatch,
    content_type: str,
    content: bytes,
) -> None:
    monkeypatch.setattr(
        profile_avatar,
        "_storage_client",
        lambda _settings: pytest.fail("Invalid images must not reach storage"),
    )

    with pytest.raises(ValueError, match="valid JPEG or PNG"):
        profile_avatar.upload_profile_avatar(Settings(_env_file=None), "profile-123", content_type, content)


def test_upload_rejects_files_over_five_mib(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(
        profile_avatar,
        "_storage_client",
        lambda _settings: pytest.fail("Oversized images must not reach storage"),
    )

    with pytest.raises(ValueError, match="smaller than 5 MB"):
        profile_avatar.upload_profile_avatar(
            Settings(_env_file=None),
            "profile-123",
            "image/png",
            b"\x89PNG\r\n\x1a\n" + b"x" * profile_avatar.MAX_PROFILE_AVATAR_BYTES,
        )


def test_signed_avatar_url_is_short_lived(monkeypatch: pytest.MonkeyPatch) -> None:
    storage_client = Mock()
    storage_client.storage.from_.return_value.create_signed_url.return_value = {
        "signedURL": "https://storage.example/signed-avatar"
    }
    monkeypatch.setattr(profile_avatar, "_storage_client", lambda _settings: storage_client)

    result = profile_avatar.create_profile_avatar_url(Settings(_env_file=None), "profile-123/avatar.png")

    assert result == "https://storage.example/signed-avatar"
    storage_client.storage.from_.return_value.create_signed_url.assert_called_once_with(
        "profile-123/avatar.png",
        expires_in=3600,
    )
