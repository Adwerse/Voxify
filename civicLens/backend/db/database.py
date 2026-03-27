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


class Response(Base):
    __tablename__ = "responses"

    id = Column(String(36), primary_key=True, index=True, default=lambda: str(uuid4()))
    poll_id = Column(String(36), ForeignKey("polls.id", ondelete="CASCADE"), nullable=False, index=True)
    nickname = Column(String, nullable=True)
    age_band = Column(String, nullable=True)
    group_tag = Column(String(40), nullable=True)
    response_text = Column(String, nullable=False)
    follow_up_token = Column(String(36), nullable=False, unique=True, index=True)
    submitted_at = Column(DateTime, default=datetime.utcnow)

    poll = relationship("Poll", back_populates="responses")


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
