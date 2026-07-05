import os
import unittest
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient
from sqlmodel import SQLModel, create_engine, Session
from database import get_session
from main import app
from models import Job, Thumbnail

# Create a temporary file-based SQLite database for testing
test_db_file = "test.db"
test_db_url = f"sqlite:///./{test_db_file}"
test_engine = create_engine(test_db_url, connect_args={"check_same_thread": False})

# Override database dependency for tests
def override_get_session():
    with Session(test_engine) as session:
        yield session

app.dependency_overrides[get_session] = override_get_session

class TestAPI(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Ensure any old test database is removed
        if os.path.exists(test_db_file):
            try:
                os.remove(test_db_file)
            except Exception:
                pass
        # Initialize tables in test database
        SQLModel.metadata.create_all(test_engine)
        cls.client = TestClient(app)

    @classmethod
    def tearDownClass(cls):
        # Drop tables and clean up the database file
        SQLModel.metadata.drop_all(test_engine)
        if os.path.exists(test_db_file):
            try:
                os.remove(test_db_file)
            except Exception:
                pass

    def test_get_nonexistent_job(self):
        """Test fetching a job that does not exist returns 404."""
        response = self.client.get("/api/job/nonexistent_id")
        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.json(), {"detail": "Job not found"})

    def test_create_job_invalid_thumbnails(self):
        """Test creating a job with invalid number of thumbnails (outside 1-3)."""
        payload = {
            "prompt": "Test Prompt",
            "headshot_url": "http://example.com/image.jpg",
            "num_thumbnails": 5
        }
        response = self.client.post("/api/job", json=payload)
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["detail"], "num_thumbnails must be between 1 and 3")

    @patch('routes.process_job', new_callable=AsyncMock)
    def test_create_job_success(self, mock_process_job):
        """Test successfully creating a job and verifying it is saved in database."""
        payload = {
            "prompt": "Test Prompt",
            "headshot_url": "http://example.com/image.jpg",
            "num_thumbnails": 2
        }
        response = self.client.post("/api/job", json=payload)
        self.assertEqual(response.status_code, 200)
        
        data = response.json()
        self.assertIn("job_id", data)
        job_id = data["job_id"]
        
        # Verify the background task was scheduled with correct job_id
        mock_process_job.assert_called_once_with(job_id)

        # Verify we can fetch the job and it has correct data
        fetch_response = self.client.get(f"/api/job/{job_id}")
        self.assertEqual(fetch_response.status_code, 200)
        job_data = fetch_response.json()
        self.assertEqual(job_data["prompt"], "Test Prompt")
        self.assertEqual(job_data["num_thumbnails"], 2)
        self.assertEqual(job_data["headshot_url"], "http://example.com/image.jpg")
        self.assertEqual(len(job_data["thumbnails"]), 2)

if __name__ == "__main__":
    unittest.main()
