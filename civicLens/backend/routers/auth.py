from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import ValidationError
from sqlalchemy.orm import Session

from db.database import Identity, User, get_db
from models.schemas import (
    AdminIdentityRead,
    AuthMeResponse,
    AuthRegisterRequest,
    AuthRegisterResponse,
    SessionClaims,
)
from security import (
    create_signed_token,
    decode_signed_token,
    encrypt_pii,
    generate_emoji_identity,
    hash_identifier,
    normalize_email,
    normalize_student_id,
    verify_student_credentials,
)

router = APIRouter(prefix="/auth", tags=["auth"])


def _extract_bearer_token(authorization: str | None) -> str:
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Authorization header")

    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token.strip():
        raise HTTPException(status_code=401, detail="Invalid Authorization header")

    return token.strip()


def get_session_claims(authorization: str | None = Header(default=None)) -> SessionClaims:
    token = _extract_bearer_token(authorization)

    try:
        payload = decode_signed_token(token)
        return SessionClaims(**payload)
    except (ValueError, ValidationError) as exc:
        raise HTTPException(status_code=401, detail=f"Invalid token: {exc}") from exc


@router.post("/register", response_model=AuthRegisterResponse)
def register(payload: AuthRegisterRequest, db: Session = Depends(get_db)) -> AuthRegisterResponse:
    name = payload.name.strip()
    email = normalize_email(payload.email)
    student_id = normalize_student_id(payload.student_id)

    if not name:
        raise HTTPException(status_code=422, detail="Name cannot be empty")

    if not verify_student_credentials(student_id=student_id, email=email):
        raise HTTPException(
            status_code=422,
            detail="Verification failed. Use a valid TCD student ID and an approved Trinity email domain.",
        )

    student_hash = hash_identifier(student_id)
    email_hash = hash_identifier(email)
    existing_user = db.query(User).filter(User.student_hash == student_hash).first()

    if existing_user:
        if existing_user.email_hash != email_hash:
            raise HTTPException(
                status_code=409,
                detail="Student ID is already registered with a different email",
            )

        identity = db.query(Identity).filter(Identity.emoji_id == existing_user.identity_emoji_id).first()
        if not identity:
            raise HTTPException(status_code=500, detail="Identity mapping is unavailable")

        token = create_signed_token(
            emoji_id=identity.emoji_id,
            verified=bool(identity.verified),
            cohort=identity.cohort_year or "Unspecified",
        )
        return AuthRegisterResponse(emoji_id=identity.emoji_id, verified=bool(identity.verified), token=token)

    existing_email = db.query(User.id).filter(User.email_hash == email_hash).first()
    if existing_email:
        raise HTTPException(status_code=409, detail="This email is already linked to another verified identity")

    cohort_year = (payload.cohort_year or "Unspecified").strip() or "Unspecified"
    demographic_band = (payload.demographic_band or cohort_year).strip() or "Unspecified"
    emoji_id = generate_emoji_identity(student_id)

    collision_user = db.query(User).filter(User.identity_emoji_id == emoji_id).first()
    if collision_user and collision_user.student_hash != student_hash:
        raise HTTPException(
            status_code=409,
            detail="Identity collision detected. Adjust EMOJI_SALT and retry.",
        )

    identity = db.query(Identity).filter(Identity.emoji_id == emoji_id).first()
    if not identity:
        identity = Identity(
            emoji_id=emoji_id,
            verified=True,
            cohort_year=cohort_year,
            demo_group=demographic_band,
        )
        db.add(identity)
        db.flush()

    user = User(
        email_hash=email_hash,
        student_hash=student_hash,
        name_encrypted=encrypt_pii(name),
        email_encrypted=encrypt_pii(email),
        student_id_encrypted=encrypt_pii(student_id),
        identity_emoji_id=identity.emoji_id,
    )

    db.add(user)
    db.commit()

    token = create_signed_token(
        emoji_id=identity.emoji_id,
        verified=bool(identity.verified),
        cohort=identity.cohort_year or "Unspecified",
    )

    return AuthRegisterResponse(emoji_id=identity.emoji_id, verified=bool(identity.verified), token=token)


@router.get("/me", response_model=AuthMeResponse)
def me(claims: SessionClaims = Depends(get_session_claims), db: Session = Depends(get_db)) -> AuthMeResponse:
    identity = db.query(Identity).filter(Identity.emoji_id == claims.emoji_id).first()
    if not identity:
        raise HTTPException(status_code=404, detail="Identity not found")

    return AuthMeResponse(
        emoji_id=identity.emoji_id,
        verified=bool(identity.verified),
        cohort=(identity.cohort_year or claims.cohort or "Unspecified"),
    )


@router.get("/admin/identities", response_model=list[AdminIdentityRead])
def list_admin_identities(db: Session = Depends(get_db)) -> list[AdminIdentityRead]:
    identities = db.query(Identity).order_by(Identity.created_at.desc()).all()
    return [
        AdminIdentityRead(
            emoji_id=item.emoji_id,
            verified=bool(item.verified),
            demographic_band=(item.demo_group or item.cohort_year or "Unspecified"),
        )
        for item in identities
    ]
