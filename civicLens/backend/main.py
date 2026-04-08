import os

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from db.database import init_db
from routers.analysis import router as analysis_router
from routers.auth import router as auth_router
from routers.polls import router as polls_router

load_dotenv()

app = FastAPI(title="CivicLens API", version="0.1.0")

frontend_origin = os.getenv("FRONTEND_URL", "http://localhost:3000")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[frontend_origin, "http://localhost:3000", "http://127.0.0.1:3000"],
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup() -> None:
    init_db()


@app.get("/")
def read_root() -> dict[str, str]:
    return {"service": "CivicLens backend", "status": "ok"}


app.include_router(polls_router)
app.include_router(analysis_router)
app.include_router(auth_router)
