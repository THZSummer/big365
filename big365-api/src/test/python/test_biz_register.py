from conftest import BASE_URL
import requests

TEST_BIZ = "biz_test"


def _register(biz_name, biz_label, dimensions, date_from="20260101", date_to="20260107"):
    """Helper: POST /api/biz/register, return (status_code, json_data)."""
    r = requests.post(f"{BASE_URL}/biz/register", json={
        "bizName": biz_name,
        "bizLabel": biz_label,
        "dimensions": dimensions,
        "dateRange": {"from": date_from, "to": date_to}
    })
    return r.status_code, r.json()


def test_register_new_business():
    """Register a new business with 2 dimensions and 7-day range."""
    status, data = _register(
        TEST_BIZ, "业务注册测试",
        [
            {"columnName": "a", "displayName": "应用", "leafMin": 1, "leafMax": 10},
            {"columnName": "b", "displayName": "接口", "leafMin": 1, "leafMax": 100}
        ],
        "20260101", "20260107"
    )
    # 200 if first time, 400 BIZ_ALREADY_EXISTS if re-run
    if status == 200:
        assert data["success"] is True
        assert data["data"]["bizName"] == TEST_BIZ
        assert "tablesCreated" in data["data"]
        tables = data["data"]["tablesCreated"]
        assert len(tables) == 3, f"Expected 3 tables created, got {len(tables)}: {tables}"
        table_names = " ".join(tables)
        assert "dimensions_t" in table_names, f"Missing dimensions_t in {tables}"
        assert "space_t" in table_names, f"Missing space_t in {tables}"
        assert "demo_jobs_t" in table_names, f"Missing demo_jobs_t in {tables}"
    else:
        assert status == 400
        assert data["code"] == "BIZ_ALREADY_EXISTS", \
            f"Expected BIZ_ALREADY_EXISTS, got {data}"


def test_duplicate_registration_rejected():
    """Registering the same bizName twice should return BIZ_ALREADY_EXISTS."""
    status, data = _register(
        TEST_BIZ, "重复注册",
        [{"columnName": "x", "displayName": "测试", "leafMin": 1, "leafMax": 1}],
        "20260101", "20260101"
    )
    assert status == 400, f"Expected 400, got {status}: {data}"
    assert data["code"] == "BIZ_ALREADY_EXISTS", \
        f"Expected BIZ_ALREADY_EXISTS, got: {data}"


def test_register_single_dimension():
    """Register with a single dimension (minimal valid case)."""
    status, data = _register(
        "biz_single_dim", "单维度业务",
        [{"columnName": "x", "displayName": "唯一维度", "leafMin": 1, "leafMax": 5}],
        "20260101", "20260101"
    )
    if status == 200:
        assert data["success"] is True
        assert len(data["data"]["tablesCreated"]) == 3
    else:
        assert data["code"] == "BIZ_ALREADY_EXISTS"


def test_register_many_dimensions():
    """Register with 10 dimensions (maximum allowed)."""
    dims = [
        {"columnName": f"d{i}", "displayName": f"维度{i}", "leafMin": 1, "leafMax": i + 1}
        for i in range(1, 11)
    ]
    status, data = _register("biz_10dim", "十维度业务", dims, "20260101", "20260102")
    if status == 200:
        assert data["success"] is True
        assert len(data["data"]["tablesCreated"]) == 3
    else:
        assert data["code"] == "BIZ_ALREADY_EXISTS"


def test_register_too_many_dimensions():
    """Registering with > 10 dimensions should be rejected."""
    dims = [
        {"columnName": f"d{i}", "displayName": f"维度{i}", "leafMin": 1, "leafMax": i + 1}
        for i in range(1, 12)
    ]
    status, data = _register("biz_11dim", "超限维度业务", dims, "20260101", "20260102")
    assert status == 400, f"Expected 400 for >10 dims, got {status}: {data}"
    assert data["code"] in ("VALIDATION_ERROR", "DIMENSION_COUNT_EXCEEDED"), \
        f"Expected validation error, got: {data}"


def test_list_contains_registered_biz():
    """GET /api/biz/list should contain the registered business."""
    r = requests.get(f"{BASE_URL}/biz/list", timeout=10)
    assert r.status_code == 200, f"List failed: {r.text}"
    data = r.json()
    assert data["success"] is True
    assert "items" in data["data"]

    items = data["data"]["items"]
    biz_names = [b["bizName"] for b in items]
    assert TEST_BIZ in biz_names, \
        f"'{TEST_BIZ}' not found in biz list: {biz_names}"

    # Verify list pagination metadata
    assert data["data"]["pageNo"] >= 1
    assert data["data"]["pageSize"] >= 1
    assert data["data"]["total"] >= len(items)


def test_list_item_structure():
    """Each biz list item should have all required fields."""
    r = requests.get(f"{BASE_URL}/biz/list", timeout=10)
    items = r.json()["data"]["items"]

    for item in items:
        assert "bizName" in item, f"Missing bizName: {item}"
        assert "bizLabel" in item, f"Missing bizLabel: {item}"
        assert "dimensionCount" in item, f"Missing dimensionCount: {item}"
        assert "status" in item, f"Missing status: {item}"

    # Find our test biz and verify its fields
    biz = next((b for b in items if b["bizName"] == TEST_BIZ), None)
    assert biz is not None, f"{TEST_BIZ} not in list"
    assert biz["dimensionCount"] >= 2, \
        f"Expected dimensionCount >= 2, got {biz['dimensionCount']}"


def test_register_empty_biz_name():
    """Registering with empty bizName should fail validation."""
    r = requests.post(f"{BASE_URL}/biz/register", json={
        "bizName": "",
        "bizLabel": "空名称",
        "dimensions": [{"columnName": "x", "displayName": "x", "leafMin": 1, "leafMax": 1}],
        "dateRange": {"from": "20260101", "to": "20260101"}
    })
    assert r.status_code == 400, f"Expected 400, got {r.status_code}: {r.text}"
    assert r.json()["code"] == "VALIDATION_ERROR"


def test_register_no_dimensions():
    """Registering with empty dimensions list should fail validation."""
    r = requests.post(f"{BASE_URL}/biz/register", json={
        "bizName": "biz_no_dim",
        "bizLabel": "无维度",
        "dimensions": [],
        "dateRange": {"from": "20260101", "to": "20260101"}
    })
    assert r.status_code == 400, f"Expected 400, got {r.status_code}: {r.text}"
    assert r.json()["code"] == "VALIDATION_ERROR"


def test_register_missing_date_range():
    """Registering without dateRange should fail validation."""
    r = requests.post(f"{BASE_URL}/biz/register", json={
        "bizName": "biz_no_date",
        "bizLabel": "无日期",
        "dimensions": [{"columnName": "x", "displayName": "x", "leafMin": 1, "leafMax": 1}]
    })
    assert r.status_code == 400, f"Expected 400, got {r.status_code}: {r.text}"


def test_register_invalid_dimension_leaf():
    """leafMin=0 should fail validation (minimum is 1)."""
    r = requests.post(f"{BASE_URL}/biz/register", json={
        "bizName": "biz_invalid_leaf",
        "bizLabel": "非法叶子",
        "dimensions": [{"columnName": "x", "displayName": "x", "leafMin": 0, "leafMax": 1}],
        "dateRange": {"from": "20260101", "to": "20260101"}
    })
    assert r.status_code == 400, f"Expected 400, got {r.status_code}: {r.text}"


def test_register_long_date_range():
    """A 365-day date range should be accepted."""
    status, data = _register(
        "biz_year_range", "一年范围业务",
        [{"columnName": "a", "displayName": "天数", "leafMin": 1, "leafMax": 10}],
        "20260101", "20261231"
    )
    if status == 200:
        assert data["success"] is True
        assert len(data["data"]["tablesCreated"]) == 3
    else:
        assert data["code"] == "BIZ_ALREADY_EXISTS"
