import httpx
from openai import AsyncOpenAI
from config import OPENAI_API_KEY

client = AsyncOpenAI(api_key=OPENAI_API_KEY)


async def _describe_person(headshot_url: str) -> str:
    """Use gpt-4o-mini vision to describe the person's appearance from the headshot."""
    response = await client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "image_url",
                        "image_url": {"url": headshot_url},
                    },
                    {
                        "type": "text",
                        "text": (
                            "Describe this person's physical appearance in detail for an AI image generator. "
                            "Include: gender, approximate age, hair color and style, eye color, skin tone, "
                            "facial features, and any notable characteristics. Be specific and concise."
                        ),
                    },
                ],
            }
        ],
        max_tokens=200,
    )
    return response.choices[0].message.content


async def generate_thumbnail(prompt: str, style_prompt: str, headshot_url: str) -> bytes:
    """
    Step 1: Use gpt-4o-mini to describe the person from their headshot.
    Step 2: Use dall-e-3 to generate the thumbnail with that description.
    Returns raw PNG bytes.
    """
    # Step 1: Describe the person
    person_description = await _describe_person(headshot_url)

    # Step 2: Build a rich prompt for DALL-E 3
    full_prompt = (
        f"{style_prompt}\n\n"
        f"The thumbnail must feature a person with this exact appearance: {person_description}\n\n"
        f"Video topic / user request: {prompt}\n\n"
        "Style: Professional YouTube thumbnail, 16:9 aspect ratio, high resolution, "
        "eye-catching composition with the person prominently featured. "
        "Do NOT include any text or titles in the image."
    )

    # Step 3: Generate with DALL-E 3 (get URL, then download bytes)
    response = await client.images.generate(
        model="gpt-image-1",
        prompt=full_prompt,
        size="1536x1024",
        quality="medium",
        n=1,
    )

    import base64
    image_b64 = response.data[0].b64_json
    return base64.b64decode(image_b64)