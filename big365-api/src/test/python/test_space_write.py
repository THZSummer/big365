"""
Integration test for Space Write API.

Tests the cascade update mechanism: writing a single data point should
update 2^d rows (all Cartesian product combinations with 0=ALL sentinel).

Prerequisites:
    - big365-api service running
    - A test biz is registered via setup_module()
"""
from conftest import BASE_URL, SPACE_BIZ_NAME
import requests

BIZ = SPACE_BIZ_NAME


def setup_module():
    """Register test biz if not already exists."""
    r = requests.post(f"{BASE_URL}/biz/register", json={
        "bizName": BIZ,
        "bizLabel": "空间测试",
        "dimensions": [
            {"columnName": "a", "displayName": "应用", "leafMin": 1, "leafMax": 10},
            {"columnName": "b", "displayName": "接口", "leafMin": 1, "leafMax": 100}
        ],
        "dateRange": {"from": "20260101", "to": "20260105"}
    })
    if r.status_code != 200:
        data = r.json()
        if data.get("code") != "BIZ_ALREADY_EXISTS":
            print(f"Setup warning: {r.status_code} {r.text}")


def test_write_and_verify_cascade():
    """Write one data point and verify Grand Total increases by the same amount."""
    # Step 1: Check Grand Total before write
    r = requests.get(f"{BASE_URL}/{BIZ}/space/query", params={
        "a": 0, "b": 0, "date": "20260101"
    })
    assert r.status_code == 200, f"Query failed: {r.text}"
    data = r.json()
    assert data["success"] is True
    before = data["data"]["value"]

    # Step 2: Write a data point
    r = requests.post(f"{BASE_URL}/{BIZ}/space/write", json={
        "coordinates": {"a": 3, "b": 7},
        "date": "20260101",
        "value": 100
    })
    assert r.status_code == 200, f"Write failed: {r.text}"
    data = r.json()
    assert data["success"] is True, f"Write unsuccessful: {data}"
    assert data["data"]["rowsAffected"] == 4, \
        f"Expected 4 rows affected (2^2), got: {data['data']['rowsAffected']}"

    # Step 3: Grand Total should increase by 100
    r = requests.get(f"{BASE_URL}/{BIZ}/space/query", params={
        "a": 0, "b": 0, "date": "20260101"
    })
    assert r.status_code == 200
    after = r.json()["data"]["value"]
    assert after == before + 100, \
        f"Grand Total should be {before + 100}, but got {after}"


def test_duplicate_write_accumulates():
    """Repeated writes to the same coordinate+date should accumulate."""
    # Check current value at a=3,b=0 (the "rollup on b" level)
    r = requests.get(f"{BASE_URL}/{BIZ}/space/query", params={
        "a": 3, "b": 0, "date": "20260101"
    })
    before = r.json()["data"]["value"]

    # Write again to the same coordinates
    r = requests.post(f"{BASE_URL}/{BIZ}/space/write", json={
        "coordinates": {"a": 3, "b": 7},
        "date": "20260101",
        "value": 50
    })
    assert r.json()["success"] is True

    # Verify accumulation at (3,0) rollup level
    r = requests.get(f"{BASE_URL}/{BIZ}/space/query", params={
        "a": 3, "b": 0, "date": "20260101"
    })
    after = r.json()["data"]["value"]
    assert after == before + 50, \
        f"Accumulated value should be {before + 50}, got {after}"


def test_write_invalid_biz():
    """Writing to non-existent biz should return error."""
    r = requests.post(f"{BASE_URL}/nonexistent_biz/space/write", json={
        "coordinates": {"x": 1},
        "date": "20260101",
        "value": 100
    })
    assert r.status_code == 400
    data = r.json()
    assert data["code"] == "BIZ_NOT_FOUND"


def test_write_invalid_dimension():
    """Writing with unknown dimension should return validation error."""
    r = requests.post(f"{BASE_URL}/{BIZ}/space/write", json={
        "coordinates": {"unknown_dim": 5},
        "date": "20260101",
        "value": 100
    })
    assert r.status_code == 400
    data = r.json()
    assert data["code"] == "VALIDATION_ERROR"


def test_write_out_of_range_value():
    """Writing with coordinate value outside leaf range should fail."""
    r = requests.post(f"{BASE_URL}/{BIZ}/space/write", json={
        "coordinates": {"a": 999, "b": 7},
        "date": "20260101",
        "value": 100
    })
    assert r.status_code == 400
    data = r.json()
    assert data["code"] == "VALIDATION_ERROR"
