"""
Integration test for Demo Data Generation API.

Tests asynchronous demo data generation: create job → poll status → verify completion.

Prerequisites:
    - big365-api service running
    - A test biz "demo_test" registered (setup via API)
"""
import requests
import time
import os

BASE_URL = os.environ.get("BIG365_API_URL", "http://localhost:8080/api")


def setup_module():
    """Register test biz if not already exists."""
    r = requests.post(f"{BASE_URL}/biz/register", json={
        "bizName": "demo_test",
        "bizLabel": "演示测试",
        "dimensions": [
            {"columnName": "a", "displayName": "应用", "leafMin": 1, "leafMax": 5},
            {"columnName": "b", "displayName": "接口", "leafMin": 1, "leafMax": 10}
        ],
        "dateRange": {"from": "20260101", "to": "20260105"}
    })
    # OK if service not running (skip tests) or biz already exists
    if r.status_code != 200:
        data = r.json()
        if data.get("code") != "BIZ_ALREADY_EXISTS":
            print(f"Setup warning: {r.status_code} {r.text}")


def _create_job(scale="small", date_from="20260101", date_to="20260103"):
    """Helper: create a demo job and return the job ID."""
    r = requests.post(f"{BASE_URL}/demo_test/demo-data/jobs", json={
        "scale": scale,
        "dateRange": {"from": date_from, "to": date_to}
    })
    assert r.status_code == 200, f"Create job failed: {r.text}"
    data = r.json()
    assert data["success"] is True, f"Create job unsuccessful: {data}"
    assert "jobId" in data["data"], f"Missing jobId in response: {data}"
    return data["data"]["jobId"]


def _poll_job(job_id, max_wait=120):
    """Helper: poll job status until completed or failed, return final JSON data."""
    while max_wait > 0:
        r = requests.get(f"{BASE_URL}/demo_test/demo-data/jobs/{job_id}")
        assert r.status_code == 200, f"Poll job failed: {r.text}"
        data = r.json()
        assert data["success"] is True, f"Poll job unsuccessful: {data}"
        status = data["data"]["status"]
        if status in ("completed", "failed"):
            return data
        time.sleep(2)
        max_wait -= 2
    # Timeout
    return r.json()


def test_create_small_job_and_poll():
    """Create a small demo job and poll until completed."""
    job_id = _create_job("small", "20260101", "20260103")
    assert job_id is not None

    data = _poll_job(job_id, max_wait=120)
    assert data["data"]["status"] == "completed", \
        f"Expected status=completed, got {data['data']['status']}. error={data['data'].get('errorMessage')}"
    assert data["data"]["progress"] == 100, \
        f"Expected progress=100, got {data['data']['progress']}"
    assert data["data"]["totalRows"] is not None
    assert data["data"]["totalRows"] > 0
    assert data["data"]["summary"] is not None
    assert "完成" in data["data"]["summary"]


def test_job_not_found():
    """Querying a nonexistent job should return DEMO_JOB_NOT_FOUND."""
    r = requests.get(f"{BASE_URL}/demo_test/demo-data/jobs/nonexistent-job-id")
    assert r.status_code == 400, f"Expected 400, got {r.status_code}"
    data = r.json()
    assert data["success"] is False
    assert data["code"] == "DEMO_JOB_NOT_FOUND", \
        f"Expected DEMO_JOB_NOT_FOUND, got {data['code']}"


def test_job_biz_not_found():
    """Creating a job for a nonexistent biz should return BIZ_NOT_FOUND."""
    r = requests.post(f"{BASE_URL}/nonexistent_biz/demo-data/jobs", json={
        "scale": "small",
        "dateRange": {"from": "20260101", "to": "20260103"}
    })
    assert r.status_code == 400, f"Expected 400, got {r.status_code}"
    data = r.json()
    assert data["code"] == "BIZ_NOT_FOUND"


def test_invalid_scale():
    """Creating a job with invalid scale should return VALIDATION_ERROR."""
    r = requests.post(f"{BASE_URL}/demo_test/demo-data/jobs", json={
        "scale": "huge",
        "dateRange": {"from": "20260101", "to": "20260103"}
    })
    assert r.status_code == 400, f"Expected 400, got {r.status_code}"
    data = r.json()
    assert data["code"] == "VALIDATION_ERROR"


def test_medium_job_progress_updates():
    """Create a medium job and verify progress updates during generation."""
    job_id = _create_job("medium", "20260101", "20260102")
    assert job_id is not None

    # Poll a few times to verify progress increases
    last_progress = -1
    waited = 0
    while waited < 60:
        r = requests.get(f"{BASE_URL}/demo_test/demo-data/jobs/{job_id}")
        data = r.json()
        status = data["data"]["status"]
        progress = data["data"]["progress"]

        # Progress should be monotonic (or at least not decrease)
        assert progress >= last_progress, \
            f"Progress went backwards: {last_progress} → {progress}"
        last_progress = progress

        if status in ("completed", "failed"):
            break
        time.sleep(2)
        waited += 2

    assert data["data"]["status"] == "completed", \
        f"Expected completed, got {data['data']['status']}"
    assert data["data"]["totalRows"] > 0


def test_multiple_jobs_parallel():
    """Create two small jobs and verify both complete independently."""
    job_id_1 = _create_job("small", "20260101", "20260101")
    job_id_2 = _create_job("small", "20260102", "20260102")

    data_1 = _poll_job(job_id_1, max_wait=120)
    data_2 = _poll_job(job_id_2, max_wait=120)

    assert data_1["data"]["status"] == "completed"
    assert data_2["data"]["status"] == "completed"
    # Verify they have different summaries (different date ranges)
    assert data_1["data"]["summary"] != data_2["data"]["summary"]


def test_generated_data_is_queryable():
    """After generation completes, the space data should be queryable."""
    job_id = _create_job("small", "20260104", "20260105")
    data = _poll_job(job_id, max_wait=120)
    assert data["data"]["status"] == "completed"

    # Query Grand Total for the first generated date
    r = requests.get(f"{BASE_URL}/demo_test/space/query", params={
        "a": 0, "b": 0, "date": "20260104"
    })
    assert r.status_code == 200, f"Space query failed: {r.text}"
    result = r.json()
    assert result["success"] is True
    assert result["data"]["value"] > 0, \
        f"Expected Grand Total > 0, got {result['data']['value']}"


def test_job_response_fields():
    """Verify the job response contains all expected fields."""
    job_id = _create_job("small", "20260101", "20260101")
    data = _poll_job(job_id, max_wait=120)
    job = data["data"]

    required_fields = ["jobId", "scale", "status", "progress", "totalRows",
                        "summary", "createdAt", "updatedAt"]
    for field in required_fields:
        assert field in job, f"Missing field: {field}"

    # After completion, errorMessage may be null — that's fine
    assert job["status"] == "completed"
    assert job["progress"] == 100
