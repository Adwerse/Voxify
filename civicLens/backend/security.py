import base64
import hashlib
import hmac
import json
import os
import re
import time
from typing import Any

from cryptography.fernet import Fernet

ANIMAL_EMOJIS = [
    "🦊",
    "🐺",
    "🦁",
    "🐯",
    "🦋",
    "🦅",
    "🐬",
    "🦄",
    "🐲",
    "🦝",
    "🦨",
    "🦡",
    "🦦",
    "🦥",
    "🐿",
    "🐢",
    "🐙",
    "🦉",
    "🦌",
    "🐧",
]

NATURE_EMOJIS = [
    "🌊",
    "🔥",
    "⚡",
    "🌪",
    "🌈",
    "🍃",
    "🌺",
    "🌙",
    "⭐",
    "🎯",
    "💫",
    "🌸",
    "🏔",
    "🌿",
    "🌻",
    "☀",
    "🌧",
    "❄",
    "🍂",
    "🌼",
]


def _auth_secret() -> str:
    return (os.getenv("AUTH_SECRET", "voxify-demo-secret-change-me") or "").strip()


def _emoji_salt() -> str:
    return (os.getenv("EMOJI_SALT", "voxify-emoji-salt") or "").strip()


def _derive_fernet_key_from_secret(secret: str) -> bytes:
    digest = hashlib.sha256(secret.encode("utf-8")).digest()
    return base64.urlsafe_b64encode(digest)


def _fernet_instance() -> Fernet:
    configured_key = (os.getenv("PII_ENCRYPTION_KEY", "") or "").strip()
    if configured_key:
        return Fernet(configured_key.encode("utf-8"))

    derived_key = _derive_fernet_key_from_secret(_auth_secret())
    return Fernet(derived_key)


_FERNET = _fernet_instance()
_STUDENT_ID_PATTERN = re.compile(os.getenv("STUDENT_ID_REGEX", r"^TUS\d{8}$"), re.IGNORECASE)
_ALLOWED_EMAIL_DOMAINS = {
    domain.strip().lower()
    for domain in (os.getenv("AUTH_ALLOWED_EMAIL_DOMAINS", "student.tus.ie,tus.ie") or "").split(",")
    if domain.strip()
}


def normalize_student_id(student_id: str) -> str:
    return student_id.strip().upper()


def normalize_email(email: str) -> str:
    return email.strip().lower()


def verify_student_credentials(student_id: str, email: str) -> bool:
    normalized_student_id = normalize_student_id(student_id)
    normalized_email = normalize_email(email)

    if not _STUDENT_ID_PATTERN.match(normalized_student_id):
        return False

    if "@" not in normalized_email:
        return False

    domain = normalized_email.split("@", 1)[1].strip().lower()
    return domain in _ALLOWED_EMAIL_DOMAINS


def generate_emoji_identity(student_id: str) -> str:
    normalized_student_id = normalize_student_id(student_id)
    digest = hashlib.sha256(f"{normalized_student_id}:{_emoji_salt()}".encode("utf-8")).hexdigest()

    first_idx = int(digest[0:2], 16) % len(ANIMAL_EMOJIS)
    second_idx = int(digest[2:4], 16) % len(NATURE_EMOJIS)
    suffix = (int(digest[4:8], 16) % 9000) + 1000

    return f"{ANIMAL_EMOJIS[first_idx]}{NATURE_EMOJIS[second_idx]}#{suffix}"


def hash_identifier(value: str) -> str:
    normalized = value.strip().lower()
    return hashlib.sha256(f"{normalized}:{_auth_secret()}".encode("utf-8")).hexdigest()


def encrypt_pii(value: str) -> str:
    return _FERNET.encrypt(value.encode("utf-8")).decode("utf-8")


def decrypt_pii(value: str) -> str:
    return _FERNET.decrypt(value.encode("utf-8")).decode("utf-8")


def _b64url_encode(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).decode("utf-8").rstrip("=")


def _b64url_decode(data: str) -> bytes:
    padding = "=" * (-len(data) % 4)
    return base64.urlsafe_b64decode(f"{data}{padding}".encode("utf-8"))


def create_signed_token(
    emoji_id: str,
    verified: bool,
    cohort: str,
    ttl_seconds: int | None = None,
) -> str:
    now = int(time.time())
    expires_in = ttl_seconds or int(os.getenv("SESSION_TTL_SECONDS", "43200"))

    payload = {
        "emoji_id": emoji_id,
        "verified": bool(verified),
        "cohort": cohort,
        "iat": now,
        "exp": now + expires_in,
    }

    payload_json = json.dumps(payload, separators=(",", ":"), sort_keys=True).encode("utf-8")
    payload_b64 = _b64url_encode(payload_json)

    signature = hmac.new(
        _auth_secret().encode("utf-8"),
        payload_b64.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()

    return f"{payload_b64}.{signature}"


def decode_signed_token(token: str) -> dict[str, Any]:
    if "." not in token:
        raise ValueError("Malformed token")

    payload_b64, supplied_sig = token.rsplit(".", 1)
    expected_sig = hmac.new(
        _auth_secret().encode("utf-8"),
        payload_b64.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()

    if not hmac.compare_digest(supplied_sig, expected_sig):
        raise ValueError("Invalid token signature")

    payload_raw = _b64url_decode(payload_b64)
    payload = json.loads(payload_raw.decode("utf-8"))

    exp = int(payload.get("exp", 0))
    if exp <= int(time.time()):
        raise ValueError("Token expired")

    if not payload.get("emoji_id"):
        raise ValueError("Token missing emoji_id")

    return payload
