from typing import Literal

from pydantic import BaseModel, EmailStr, Field, field_validator

ProfileType = Literal["individual", "workshop", "business"]


class SignUpRequest(BaseModel):
    display_name: str = Field(min_length=2, max_length=80)
    email: EmailStr
    password: str = Field(min_length=10, max_length=128)
    profile_type: ProfileType

    @field_validator("display_name")
    @classmethod
    def trim_display_name(cls, value: str) -> str:
        cleaned = value.strip()
        if len(cleaned) < 2:
            raise ValueError("Enter a name with at least two characters.")
        return cleaned


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class ProfileResponse(BaseModel):
    display_name: str
    profile_type: ProfileType


class AuthUserResponse(BaseModel):
    id: str
    email: EmailStr | None
    profile: ProfileResponse


class AuthResponse(BaseModel):
    user: AuthUserResponse
