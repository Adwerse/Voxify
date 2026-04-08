import os
from datetime import datetime
from typing import Generator
from uuid import uuid4

from dotenv import load_dotenv
from sqlalchemy import JSON, Boolean, Column, DateTime, ForeignKey, String, create_engine
from sqlalchemy.orm import Session, declarative_base, relationship, sessionmaker

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./civicLens.db")

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class Poll(Base):
    __tablename__ = "polls"

    id = Column(String(36), primary_key=True, index=True, default=lambda: str(uuid4()))
    title = Column(String, nullable=False)
    question = Column(String, nullable=False)
    organisation = Column(String, nullable=False)
    mode = Column(String, nullable=False)
    institution_demographics = Column(JSON, nullable=False)
    under16_consent_confirmed = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)
    responses = relationship("Response", back_populates="poll", cascade="all, delete-orphan")
    analysis = relationship("Analysis", back_populates="poll", uselist=False, cascade="all, delete-orphan")


class Identity(Base):
    __tablename__ = "identities"

    emoji_id = Column(String(20), primary_key=True, index=True)
    verified = Column(Boolean, nullable=False, default=False, index=True)
    cohort_year = Column(String(40), nullable=True, default="Unspecified")
    demo_group = Column(String(40), nullable=True, default="Unspecified")
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="identity", uselist=False)
    responses = relationship("Response", back_populates="identity")


class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, index=True, default=lambda: str(uuid4()))
    email_hash = Column(String(64), nullable=False, unique=True, index=True)
    student_hash = Column(String(64), nullable=False, unique=True, index=True)
    name_encrypted = Column(String, nullable=False)
    email_encrypted = Column(String, nullable=False)
    student_id_encrypted = Column(String, nullable=False)
    identity_emoji_id = Column(
        String(20),
        ForeignKey("identities.emoji_id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    created_at = Column(DateTime, default=datetime.utcnow)

    identity = relationship("Identity", back_populates="user")


class Response(Base):
    __tablename__ = "responses"

    id = Column(String(36), primary_key=True, index=True, default=lambda: str(uuid4()))
    poll_id = Column(String(36), ForeignKey("polls.id", ondelete="CASCADE"), nullable=False, index=True)
    emoji_id = Column(String(20), ForeignKey("identities.emoji_id", ondelete="CASCADE"), nullable=False, index=True)
    nickname = Column(String, nullable=True)
    age_band = Column(String, nullable=True)
    group_tag = Column(String(40), nullable=True)
    response_text = Column(String, nullable=False)
    follow_up_token = Column(String(36), nullable=False, unique=True, index=True)
    submitted_at = Column(DateTime, default=datetime.utcnow)

    poll = relationship("Poll", back_populates="responses")
    identity = relationship("Identity", back_populates="responses")


class Analysis(Base):
    __tablename__ = "analyses"

    id = Column(String(36), primary_key=True, index=True, default=lambda: str(uuid4()))
    poll_id = Column(String(36), ForeignKey("polls.id", ondelete="CASCADE"), nullable=False, unique=True)
    themes = Column(JSON, nullable=False, default=list)
    sentiment_summary = Column(JSON, nullable=False, default=dict)
    conflicting_viewpoints = Column(JSON, nullable=False, default=list)
    missing_voices = Column(JSON, nullable=False, default=dict)
    generated_at = Column(DateTime, default=datetime.utcnow)

    poll = relationship("Poll", back_populates="analysis")


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    Base.metadata.create_all(bind=engine)
    _run_sqlite_migrations()


def _run_sqlite_migrations() -> None:
    if not DATABASE_URL.startswith("sqlite"):
        return

    with engine.begin() as connection:
        has_responses_table = connection.exec_driver_sql(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='responses'"
        ).first()
        if not has_responses_table:
            return

        columns = connection.exec_driver_sql("PRAGMA table_info('responses')").mappings().all()
        column_names = {str(row.get("name", "")) for row in columns}

        if "emoji_id" not in column_names:
            # Backwards-compatible migration for pre-auth demo databases.
            connection.exec_driver_sql("ALTER TABLE responses ADD COLUMN emoji_id VARCHAR")

        connection.exec_driver_sql("CREATE INDEX IF NOT EXISTS ix_responses_emoji_id ON responses (emoji_id)")
