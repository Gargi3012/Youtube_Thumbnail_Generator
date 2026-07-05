# Youtube Thumbnail Generator

A web application that generates customized, professional YouTube thumbnails by merging user headshots with AI-generated scenes. The application uses a FastAPI backend with SQLModel and a React (Vite) frontend, integrating OpenAI's DALL-E and ImageKit.io for asset hosting.

**Live Demo:** [https://youtube-thumbnail-generator-black.vercel.app/](https://youtube-thumbnail-generator-black.vercel.app/)

## Technology Stack

### Backend
* **Framework:** FastAPI
* **ORM:** SQLModel (SQLite/PostgreSQL compatible)
* **Image Hosting:** ImageKit.io
* **AI Generation:** OpenAI API (DALL-E)
* **Task Handling:** Asynchronous asyncio background processing

### Frontend
* **Build Tool:** Vite
* **Library:** React (JS)
* **Styling:** Vanilla CSS (Light Mode design system)
* **Icons:** Lucide React

---

## Getting Started

### 1. Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create a virtual environment:
   ```bash
   python -m venv venv
   ```
3. Activate the virtual environment:
   * **Windows:** `.\venv\Scripts\activate`
   * **macOS/Linux:** `source venv/bin/activate`
4. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
5. Create a `.env` file in the `backend` folder:
   ```env
   OPENAI_API_KEY=your_openai_api_key
   IMAGEKIT_PRIVATE_KEY=your_imagekit_private_key
   IMAGEKIT_PUBLIC_KEY=your_imagekit_public_key
   IMAGEKIT_URL_ENDPOINT=your_imagekit_url_endpoint
   DATABASE_URL=sqlite:///./thumbnailbuilder.db
   ```
6. Run the FastAPI server:
   ```bash
   uvicorn main:app --reload
   ```

### 2. Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
4. Open `http://localhost:5173/` in your browser. All requests to `/api` will be proxied automatically to `http://localhost:8000`.

---
<img width="863" height="448" alt="ss" src="https://github.com/user-attachments/assets/aac61fea-90cf-49ae-8647-083a3657393e" />

## API Endpoints
* `POST /api/upload-headshot` - Uploads headshot images to ImageKit.
* `POST /api/job` - Triggers background thumbnail generation tasks.
* `GET /api/job/{job_id}` - Fetches job status and generated image variants.
* `GET /api/jobs/{job_id}/stream` - SSE stream to push real-time generation updates.

---
By Gargi
