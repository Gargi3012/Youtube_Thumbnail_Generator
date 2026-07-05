import os
from dotenv import load_dotenv

load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
IMAGEKIT_PRIVATE_KEY = os.getenv("IMAGEKIT_PRIVATE_KEY") 
IMAGEKIT_PUBLIC_KEY = os.getenv("IMAGEKIT_PUBLIC_KEY")
IMAGEKIT_URL_ENDPOINT = os.getenv("IMAGEKIT_URL_ENDPOINT")

# Use /tmp directory for SQLite on Vercel as it is the only writable directory
default_db = "sqlite:////tmp/thumbnailbuilder.db" if os.getenv("VERCEL") == "1" else "sqlite:///./thumbnailbuilder.db"
DATABASE_URL = os.getenv("DATABASE_URL", default_db)

