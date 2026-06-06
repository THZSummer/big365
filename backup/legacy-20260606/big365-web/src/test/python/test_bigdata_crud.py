"""
大数据 CRUD 接口测试
====================
测试 /api/v1/bigdata365/* 的增删改查接口

注意: 当前版本 POST/PUT/DELETE 存在已知 Bug（实际调用的是 findOne），
      测试会如实反映当前行为。

独立运行:
    python test_bigdata_crud.py
"""

import requests
from conftest import BASE_URL, TIMEOUT, api_url, print_result, run_test

API_PREFIX = "/api/v1/bigdata365"


def test_list() -> bool:
    """测试列表查询 GET /s/list"""
    resp = requests.get(api_url(f"{API_PREFIX}/s/list"), timeout=TIMEOUT)
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list), f"\u8fd4\u56de\u7c7b\u578b\u5f02\u5e38: {type(data)}"
    print(f"  \u8fd4\u56de\u8bb0\u5f55\u6570: {len(data)}")
    return True


def test_get_by_id() -> bool:
    """测试单条查询 GET /r/{id}"""
    resp = requests.get(api_url(f"{API_PREFIX}/r/1"), timeout=TIMEOUT)
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, dict), f"\u8fd4\u56de\u7c7b\u578b\u5f02\u5e38: {type(data)}"
    print(f"  \u8fd4\u56de\u6570\u636e: {data}")
    return True


def test_get_by_id_not_found() -> bool:
    """测试查询不存在的 ID"""
    resp = requests.get(api_url(f"{API_PREFIX}/r/999999"), timeout=TIMEOUT)
    # 期望返回 200 但数据为空，或返回 404
    print(f"  \u72b6\u6001\u7801: {resp.status_code}, \u54cd\u5e94: {resp.text[:200]}")
    return True


def test_create_know_bug() -> bool:
    """
    测试新增 POST /r/{id}

    ⚠️ 已知 Bug: 当前实现实际调用的是 findOne(id) 而非 createOne，
       测试验证的是当前实际行为而非期望行为。
    """
    resp = requests.post(api_url(f"{API_PREFIX}/r/1"), timeout=TIMEOUT)
    assert resp.status_code == 200
    data = resp.json()
    print(f"  \u26a0\ufe0f \u5f53\u524d\u884c\u4e3a\uff08\u8c03\u7528 findOne \u800c\u975e createOne\uff09: {data}")
    return True


def test_update_know_bug() -> bool:
    """
    测试更新 PUT /r/{id}

    ⚠️ 已知 Bug: 当前实现实际调用的是 findOne(id) 而非 updateOne，
       测试验证的是当前实际行为。
    """
    resp = requests.put(api_url(f"{API_PREFIX}/r/1"), timeout=TIMEOUT)
    assert resp.status_code == 200
    data = resp.json()
    print(f"  \u26a0\ufe0f \u5f53\u524d\u884c\u4e3a\uff08\u8c03\u7528 findOne \u800c\u975e updateOne\uff09: {data}")
    return True


def test_delete_know_bug() -> bool:
    """
    测试删除 DELETE /r/{id}

    ⚠️ 已知 Bug: 当前实现实际调用的是 findOne(id) 而非 deleteOne，
       测试验证的是当前实际行为。
    """
    resp = requests.delete(api_url(f"{API_PREFIX}/r/1"), timeout=TIMEOUT)
    assert resp.status_code == 200
    data = resp.json()
    print(f"  \u26a0\ufe0f \u5f53\u524d\u884c\u4e3a\uff08\u8c03\u7528 findOne \u800c\u975e deleteOne\uff09: {data}")
    return True


def main():
    """运行本模块所有测试"""
    print(f"\n{'='*50}")
    print(f"  \u5927\u6570\u636e CRUD \u63a5\u53e3\u6d4b\u8bd5 - {api_url(API_PREFIX)}")
    print(f"{'='*50}")

    results = [
        run_test("\u5217\u8868\u67e5\u8be2 GET /s/list", test_list),
        run_test("\u5355\u6761\u67e5\u8be2 GET /r/1", test_get_by_id),
        run_test("\u67e5\u8be2\u4e0d\u5b58\u5728\u7684 ID", test_get_by_id_not_found),
        run_test("[\u5df2\u77e5Bug] POST \u5b9e\u9645\u8c03\u7528 findOne", test_create_know_bug),
        run_test("[已知Bug] PUT 实际调用 findOne", test_update_know_bug),
        run_test("[已知Bug] DELETE 实际调用 findOne", test_delete_know_bug),
    ]

    passed = sum(results)
    failed = len(results) - passed
    print(f"\n  \u7ed3\u679c: {passed} passed / {failed} failed")
    if any("\u5df2\u77e5Bug" in str(r) for r in results):
        print(f"  \u26a0\ufe0f \u5305\u542b\u5df2\u77e5 Bug \u6d4b\u8bd5\uff0c\u9700\u4fee\u590d\u63a7\u5236\u5668\u540e\u91cd\u65b0\u9a8c\u8bc1")
    print(f"{'='*50}\n")
    return failed == 0


if __name__ == "__main__":
    import sys
    sys.exit(0 if main() else 1)
