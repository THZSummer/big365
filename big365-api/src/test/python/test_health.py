from conftest import BASE_URL
import requests


def test_health_returns_ok():
    """GET /api/health should return 200 with success=true."""
    r = requests.get(f"{BASE_URL}/health", timeout=10)
    assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
    data = r.json()
    assert data["success"] is True, f"success should be true: {data}"
    assert data["code"] == "OK", f"code should be OK: {data}"
    assert data["message"] == "success"


def test_health_data_structure():
    """Health response data should contain status/service/timestamp/database fields."""
    r = requests.get(f"{BASE_URL}/health", timeout=10)
    data = r.json()["data"]

    assert data["status"] == "UP", f"status should be UP: {data}"
    assert data["service"] == "big365-api", f"service should be big365-api: {data}"
    assert "timestamp" in data, f"timestamp field missing: {data}"
    assert "database" in data, f"database field missing: {data}"


def test_health_database_status():
    """When DB is reachable, database field should be 'UP'."""
    r = requests.get(f"{BASE_URL}/health", timeout=10)
    data = r.json()

    if r.status_code == 200:
        assert data["data"]["database"] == "UP", \
            f"Expected database=UP when status is 200, got: {data['data']['database']}"
    elif r.status_code == 503:
        assert data["data"]["database"] == "DOWN"
        assert data["code"] == "DATABASE_UNAVAILABLE"
        assert data["success"] is False


def test_health_response_time():
    """Health check should respond quickly (< 5 seconds)."""
    import time
    start = time.time()
    r = requests.get(f"{BASE_URL}/health", timeout=10)
    elapsed = time.time() - start
    assert elapsed < 5, f"Health check took {elapsed:.2f}s, expected < 5s"
    assert r.status_code in (200, 503)


def test_health_idempotent():
    """Multiple health checks should return consistent results."""
    r1 = requests.get(f"{BASE_URL}/health", timeout=10)
    r2 = requests.get(f"{BASE_URL}/health", timeout=10)
    r3 = requests.get(f"{BASE_URL}/health", timeout=10)

    assert r1.status_code == r2.status_code == r3.status_code
    assert r1.json()["success"] == r2.json()["success"] == r3.json()["success"]
