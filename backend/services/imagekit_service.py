import asyncio
from imagekitio import ImageKit
from config import IMAGEKIT_PRIVATE_KEY

imagekit = ImageKit(private_key=IMAGEKIT_PRIVATE_KEY)


async def upload_file(file_bytes: bytes, file_name: str, folder: str, content_type: str = "image/png") -> str:
    """Uploads a file to ImageKit and returns the CDN URL."""
    def _upload():
        result = imagekit.files.upload(
            file=file_bytes,
            file_name=file_name,
            folder=folder,
            use_unique_file_name=True,
        )
        return result.url

    url = await asyncio.to_thread(_upload)
    return url


def get_variants(base_url: str) -> dict:
    """Returns 3 size variant URLs using ImageKit transformation parameters."""
    return {
        "youtube": f"{base_url}?tr=w-1280,h-720,c-maintain_ratio,fo-auto",
        "shorts":  f"{base_url}?tr=w-1080,h-1920,c-maintain_ratio,fo-auto",
        "square":  f"{base_url}?tr=w-1080,h-1080,c-maintain_ratio,fo-auto",
    }
