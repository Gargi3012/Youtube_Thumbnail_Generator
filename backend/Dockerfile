# ─────────────────────────────────────────────
# Stage 1: Build stage (install dependencies)
# ─────────────────────────────────────────────
FROM python:3.11-slim AS builder

# Set working directory
WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy only requirements first (for Docker layer caching)
COPY requirements.txt .

# Install Python dependencies into a separate folder (for copying later)
RUN pip install --upgrade pip && \
    pip install --prefix=/install --no-cache-dir -r requirements.txt


# ─────────────────────────────────────────────
# Stage 2: Production stage (lean final image)
# ─────────────────────────────────────────────
FROM python:3.11-slim AS production

# Set working directory
WORKDIR /app

# Copy installed Python packages from builder
COPY --from=builder /install /usr/local

# Copy application source code
COPY . .

# Create a directory for SQLite database (persistent volume can be mounted here)
RUN mkdir -p /app/data

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DATABASE_URL=sqlite:////app/data/thumbnailbuilder.db

# Expose port (Render/Railway use PORT env var, default 8000)
EXPOSE 8000

# Start FastAPI with uvicorn
# Uses $PORT if set by platform (Render sets it), otherwise defaults to 8000
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
