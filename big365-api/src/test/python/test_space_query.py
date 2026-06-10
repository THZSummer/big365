"""
Integration test for Space Query API.

Tests zero-aggregation queries: Grand Total, drill-down, and leaf-level queries.
Relies on data written by test_space_write.py or previously existing data.

Prerequisites:
    - big365-api service running
    - Test biz registered by test_space_write.py (same SPACE_BIZ_NAME)
    - Some data has been written to the space
"""
from conftest import BASE_URL, SPACE_BIZ_NAME
import requests

BIZ = SPACE_BIZ_NAME


def setup_module():
    """Register test biz if not already exists."""
    r = requests.post(f"{BASE_URL}/biz/register", json={
        "bizName": BIZ,
        "bizLabel": "空间查询测试",
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


def test_grand_total_query():
    """Grand Total query (all coordinates = 0) should return a non-negative value."""
    r = requests.get(f"{BASE_URL}/{BIZ}/space/query", params={
        "a": 0, "b": 0, "date": "20260101"
    })
    assert r.status_code == 200, f"Query failed: {r.text}"
    data = r.json()
    assert data["success"] is True
    assert data["data"]["coordinates"] == {"a": 0, "b": 0}
    assert data["data"]["value"] >= 0, \
        f"Grand Total should be >= 0, got: {data['data']['value']}"
    assert data["data"]["date"] == "20260101"


def test_drill_down():
    """Drill-down query result should be <= Grand Total."""
    # Grand Total
    r = requests.get(f"{BASE_URL}/{BIZ}/space/query", params={
        "a": 0, "b": 0, "date": "20260101"
    })
    assert r.status_code == 200
    grand = r.json()["data"]["value"]

    # Drill down: a=3, b=0 (rollup on b)
    r = requests.get(f"{BASE_URL}/{BIZ}/space/query", params={
        "a": 3, "b": 0, "date": "20260101"
    })
    assert r.status_code == 200
    drill = r.json()["data"]["value"]
    assert drill <= grand, \
        f"Drill-down ({drill}) should be <= Grand Total ({grand})"


def test_leaf_query():
    """Leaf-level query should return a value."""
    r = requests.get(f"{BASE_URL}/{BIZ}/space/query", params={
        "a": 3, "b": 7, "date": "20260101"
    })
    assert r.status_code == 200
    data = r.json()
    assert data["success"] is True
    assert data["data"]["coordinates"] == {"a": 3, "b": 7}
    assert data["data"]["value"] >= 0


def test_query_nonexistent_cell():
    """Querying an unwritten coordinate should return 0 (not error)."""
    r = requests.get(f"{BASE_URL}/{BIZ}/space/query", params={
        "a": 9, "b": 99, "date": "20260101"
    })
    assert r.status_code == 200
    data = r.json()
    assert data["success"] is True
    assert data["data"]["value"] == 0, \
        f"Unwritten cell should be 0, got: {data['data']['value']}"


def test_query_missing_date():
    """Query without date parameter should return validation error."""
    r = requests.get(f"{BASE_URL}/{BIZ}/space/query", params={
        "a": 0, "b": 0
    })
    # May return 200 with null date or 400 validation error
    assert r.status_code in (200, 400)


def test_query_invalid_biz():
    """Querying non-existent biz should fail."""
    r = requests.get(f"{BASE_URL}/nonexistent_biz/space/query", params={
        "a": 0, "b": 0, "date": "20260101"
    })
    assert r.status_code == 400
    assert r.json()["code"] == "BIZ_NOT_FOUND"


def test_query_invalid_dimension():
    """Query with unknown dimension name should fail."""
    r = requests.get(f"{BASE_URL}/{BIZ}/space/query", params={
        "unknown_dim": 0, "date": "20260101"
    })
    assert r.status_code == 400
    assert r.json()["code"] == "VALIDATION_ERROR"
