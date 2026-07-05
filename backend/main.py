import logging
import os
import sys
from contextlib import asynccontextmanager

# Add current directory to path for Vercel module resolution
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI


from fastapi.middleware.cors import CORSMiddleware
from database import create_tables
from routes import router


@asynccontextmanager
async def lifespan(app: FastAPI):
    create_tables()
    yield

app = FastAPI(
    title=" YouTube Thumbnail Generator API",
    lifespan=lifespan
)

# Read allowed origins from env var (comma-separated) or fallback to localhost
_raw_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:5174")
origins = [o.strip() for o in _raw_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"https?://(localhost|.*\.vercel\.app)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"status": "healthy", "message": "YouTube Thumbnail Generator API is running!"}

app.include_router(router)