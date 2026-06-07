from conftest import BASE_URL
import requests
import time

BIZ_NAME = "dim_test"


def test_health():
    """Verify API is reachable"""
    r = requests.get(f"{BASE_URL}/health", timeout=10)
    assert r.status_code == 200
    data = r.json()
    assert data["success"] is True


def test_register_biz():
    """Register a test business for dimension tests"""
    r = requests.post(f"{BASE_URL}/biz/register", json={
        "bizName": BIZ_NAME,
        "bizLabel": "维度测试",
        "dimensions": [
            {"columnName": "a", "displayName": "应用", "leafMin": 1, "leafMax": 10},
            {"columnName": "b", "displayName": "接口", "leafMin": 1, "leafMax": 100}
        ],
        "dateRange": {"from": "20260101", "to": "20260103"}
    })
    if r.status_code == 400:
        # Already exists from previous run — acceptable
        data = r.json()
        if data.get("code") != "BIZ_ALREADY_EXISTS":
            print(f"Unexpected 400: {data}")
            assert False, f"Unexpected registration error: {data}"
    else:
        assert r.status_code == 200
        data = r.json()
        assert data["success"] is True


def test_list_dimensions_initial():
    """After registration, the biz should have the 2 initial dimensions"""
    r = requests.get(f"{BASE_URL}/{BIZ_NAME}/dimensions", timeout=10)
    assert r.status_code == 200
    data = r.json()
    assert data["success"] is True
    items = data["data"]["items"]
    assert len(items) == 2
    columns = {d["columnName"] for d in items}
    assert "a" in columns
    assert "b" in columns


def test_create_dimension():
    """Create a new dimension"""
    r = requests.post(f"{BASE_URL}/{BIZ_NAME}/dimensions", json={
        "columnName": "c",
        "displayName": "状态码",
        "description": "HTTP 状态码维度",
        "leafMin": 1,
        "leafMax": 500
    })
    assert r.status_code == 200
    data = r.json()
    assert data["success"] is True
    assert data["data"]["columnName"] == "c"
    assert data["data"]["displayName"] == "状态码"
    assert data["data"]["id"] is not None


def test_create_duplicate_dimension():
    """Creating dimension with duplicate columnName should fail"""
    r = requests.post(f"{BASE_URL}/{BIZ_NAME}/dimensions", json={
        "columnName": "c",
        "displayName": "重复",
        "leafMin": 1,
        "leafMax": 10
    })
    assert r.status_code == 400
    data = r.json()
    assert data["code"] == "DIMENSION_CODE_DUPLICATED"


def test_list_dimensions():
    """List all dimensions (should have 3 now)"""
    r = requests.get(f"{BASE_URL}/{BIZ_NAME}/dimensions", timeout=10)
    assert r.status_code == 200
    data = r.json()
    assert data["success"] is True
    items = data["data"]["items"]
    assert len(items) >= 3
    # Verify pagination metadata
    assert "pageNo" in data["data"]
    assert "pageSize" in data["data"]
    assert "total" in data["data"]


def test_get_dimension():
    """Get a single dimension by id"""
    r = requests.get(f"{BASE_URL}/{BIZ_NAME}/dimensions", timeout=10)
    items = r.json()["data"]["items"]
    dim_id = items[0]["id"]

    r = requests.get(f"{BASE_URL}/{BIZ_NAME}/dimensions/{dim_id}", timeout=10)
    assert r.status_code == 200
    data = r.json()
    assert data["success"] is True
    assert data["data"]["id"] == dim_id


def test_get_nonexistent_dimension():
    """Getting a non-existent dimension should return error"""
    r = requests.get(f"{BASE_URL}/{BIZ_NAME}/dimensions/99999", timeout=10)
    assert r.status_code == 400
    data = r.json()
    assert data["code"] == "DIMENSION_NOT_FOUND"


def test_update_dimension():
    """Update a dimension's display name and description"""
    r = requests.get(f"{BASE_URL}/{BIZ_NAME}/dimensions", timeout=10)
    items = r.json()["data"]["items"]
    dim_id = items[0]["id"]

    r = requests.put(f"{BASE_URL}/{BIZ_NAME}/dimensions/{dim_id}", json={
        "displayName": "已更新",
        "description": "更新后的描述"
    })
    assert r.status_code == 200
    data = r.json()
    assert data["success"] is True
    assert data["data"]["displayName"] == "已更新"
    assert data["data"]["description"] == "更新后的描述"


def test_disable_dimension():
    """Disable (soft-delete) a dimension, then verify it's disabled"""
    r = requests.get(f"{BASE_URL}/{BIZ_NAME}/dimensions", timeout=10)
    items = r.json()["data"]["items"]
    dim_id = items[0]["id"]

    r = requests.delete(f"{BASE_URL}/{BIZ_NAME}/dimensions/{dim_id}", timeout=10)
    assert r.status_code == 200
    data = r.json()
    assert data["success"] is True

    # Verify disabled
    r = requests.get(f"{BASE_URL}/{BIZ_NAME}/dimensions/{dim_id}", timeout=10)
    data = r.json()
    assert data["data"]["enabled"] is False


def test_disable_already_disabled():
    """Disabling an already-disabled dimension should be idempotent"""
    r = requests.get(f"{BASE_URL}/{BIZ_NAME}/dimensions", timeout=10)
    items = r.json()["data"]["items"]
    # Find a disabled one
    disabled = [d for d in items if d.get("enabled") is False]
    if disabled:
        dim_id = disabled[0]["id"]
        r = requests.delete(f"{BASE_URL}/{BIZ_NAME}/dimensions/{dim_id}", timeout=10)
        assert r.status_code == 200
        data = r.json()
        assert data["success"] is True


def test_create_dimension_nonexistent_biz():
    """Creating dimension for non-existent biz should fail"""
    r = requests.post(f"{BASE_URL}/nonexistent_biz_999/dimensions", json={
        "columnName": "x",
        "displayName": "测试",
        "leafMin": 1,
        "leafMax": 10
    })
    assert r.status_code == 400
    data = r.json()
    assert data["code"] == "BIZ_NOT_FOUND"
