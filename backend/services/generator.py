import asyncio
import logging

from sqlmodel import Session, select
from database import engine
from models import Job, Thumbnail
from services.openai_service import generate_thumbnail
from services.imagekit_service import upload_file

logger = logging.getLogger(__name__)

STYLES = {
    "bold_dramatic": (
        "Create a bold, dramatic YouTube thumbnail with high contrast, "
        "cinematic lighting, dark moody background, and powerful composition. "
        "The person's face should be prominent with a dramatic expression."
    ),
    "clean_minimal": (
        "Create a clean, minimal YouTube thumbnail with bright lighting, "
        "white/light background, modern professional aesthetic, plenty of "
        "whitespace, and sharp clean composition. The person should look "
        "approachable and professional."
    ),
    "vibrant_energetic": (
        "Create a vibrant, energetic YouTube thumbnail with colorful gradients, "
        "dynamic angles, eye-catching pop-art style colors, and energetic "
        "composition. The person's face should have an excited or engaging expression."
    ),
}

STYLE_ORDER = ["clean_minimal", "bold_dramatic", "vibrant_energetic"]


async def generate_single_thumbnail(thumbnail_id: str, prompt: str, headshot_url: str):
    """Generate one thumbnail, upload it, and update the DB."""

    # Mark as generating
    with Session(engine) as session:
        thumb = session.get(Thumbnail, thumbnail_id)
        if not thumb:
            logger.error(f"Thumbnail {thumbnail_id} not found")
            return
        thumb.status = "generating"
        style_name = thumb.style_name
        session.add(thumb)
        session.commit()

    style_prompt = STYLES.get(style_name, "")

    try:
        # Call OpenAI to get image bytes
        image_bytes = await generate_thumbnail(prompt, style_prompt, headshot_url)

        # Get job_id for folder path
        with Session(engine) as session:
            thumb = session.get(Thumbnail, thumbnail_id)
            job_id = thumb.job_id

        # Upload to ImageKit
        url = await upload_file(
            file_bytes=image_bytes,
            file_name=f"{thumbnail_id}.png",
            folder=f"/thumbnails/{job_id}/",
        )

        # Save URL and mark uploaded
        with Session(engine) as session:
            thumb = session.get(Thumbnail, thumbnail_id)
            thumb.imagekit_url = url
            thumb.status = "uploaded"
            session.add(thumb)
            session.commit()

        logger.info(f"Thumbnail {thumbnail_id} generated and uploaded successfully.")

    except Exception as e:
        logger.error(f"Error generating thumbnail {thumbnail_id}: {e}")
        with Session(engine) as session:
            thumb = session.get(Thumbnail, thumbnail_id)
            if thumb:
                thumb.status = "failed"
                thumb.error_message = str(e)[:500]
                session.add(thumb)
                session.commit()


async def process_job(job_id: str):
    """Mark job as processing, generate all thumbnails, then mark done."""

    # Mark job as processing and collect thumbnail IDs
    with Session(engine) as session:
        job = session.get(Job, job_id)
        if not job:
            logger.error(f"Job {job_id} not found")
            return
        job.status = "processing"
        prompt = job.prompt
        headshot_url = job.headshot_url
        session.add(job)
        session.commit()

        thumbnails = session.exec(
            select(Thumbnail).where(Thumbnail.job_id == job_id)
        ).all()
        thumbnail_ids = [t.id for t in thumbnails]

    # Generate all thumbnails concurrently
    tasks = [
        generate_single_thumbnail(tid, prompt, headshot_url)
        for tid in thumbnail_ids
    ]
    await asyncio.gather(*tasks, return_exceptions=True)

    # Mark job completed or failed
    with Session(engine) as session:
        thumbnails = session.exec(
            select(Thumbnail).where(Thumbnail.job_id == job_id)
        ).all()
        all_failed = all(t.status == "failed" for t in thumbnails)
        job = session.get(Job, job_id)
        if job:
            job.status = "failed" if all_failed else "completed"
            session.add(job)
            session.commit()
