/**
 * API service helpers to interact with the FastAPI backend.
 * Routes are proxied to http://localhost:8000 via Vite configuration.
 */

/**
 * Uploads a headshot image file to the backend.
 * @param {File} file - The image file to upload.
 * @returns {Promise<{url: string}>} - The ImageKit URL of the uploaded image.
 */
export async function uploadHeadshot(file) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch('/api/upload-headshot', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to upload headshot');
  }

  return response.json();
}

/**
 * Creates a new thumbnail generation job.
 * @param {string} prompt - Prompt describing the thumbnail.
 * @param {string} headshotUrl - The uploaded headshot ImageKit URL.
 * @param {number} numThumbnails - Number of thumbnails to generate (1-3).
 * @returns {Promise<{job_id: string}>} - The created job ID.
 */
export async function createJob(prompt, headshotUrl, numThumbnails) {
  const response = await fetch('/api/job', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt,
      headshot_url: headshotUrl,
      num_thumbnails: numThumbnails,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to create generation job');
  }

  return response.json();
}

/**
 * Retrieves the full status of a job and its generated thumbnails.
 * @param {string} jobId - The job UUID.
 * @returns {Promise<object>} - Detailed job status.
 */
export async function getJobStatus(jobId) {
  const response = await fetch(`/api/job/${jobId}`);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to fetch job status');
  }

  return response.json();
}

/**
 * Connects to the Server-Sent Events (SSE) stream for real-time thumbnail updates.
 * @param {string} jobId - The job UUID.
 * @param {object} callbacks - Event callbacks.
 * @param {function} callbacks.onThumbnailReady - Triggered when a thumbnail is generated.
 * @param {function} callbacks.onThumbnailFailed - Triggered when a thumbnail generation fails.
 * @param {function} callbacks.onCompleted - Triggered when the entire job finishes.
 * @param {function} callbacks.onError - Triggered when an error occurs.
 * @returns {EventSource} - The EventSource instance (caller must close it when finished).
 */
export function streamJobStatus(jobId, { onThumbnailReady, onThumbnailFailed, onCompleted, onError }) {
  const eventSource = new EventSource(`/api/jobs/${jobId}/stream`);

  eventSource.addEventListener('thumbnail_ready', (event) => {
    try {
      const data = JSON.parse(event.data);
      if (onThumbnailReady) onThumbnailReady(data);
    } catch (e) {
      console.error('Error parsing thumbnail_ready event:', e);
    }
  });

  eventSource.addEventListener('thumbnail_failed', (event) => {
    try {
      const data = JSON.parse(event.data);
      if (onThumbnailFailed) onThumbnailFailed(data);
    } catch (e) {
      console.error('Error parsing thumbnail_failed event:', e);
    }
  });

  eventSource.addEventListener('job_completed', (event) => {
    try {
      const data = JSON.parse(event.data);
      if (onCompleted) onCompleted(data);
      eventSource.close(); // Close the stream when job is fully completed
    } catch (e) {
      console.error('Error parsing job_completed event:', e);
    }
  });

  eventSource.addEventListener('error', (event) => {
    console.error('SSE connection error:', event);
    if (onError) onError(event);
  });

  return eventSource;
}
