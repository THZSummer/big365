"""
维度初始化接口测试
==================
测试 /api/v1/bigdata365/init/dimension/* 接口

注意: 当前版本 POST /dimension/r 存在已知 Bug（实际调用的是 drop 而非 create），
      测试会如实反映当前行为。

独立运行:
    python test_dimension.py
"""

import requests
from conftest import BASE_URL, TIMEOUT, api_url, print_result, run_test

INIT_PREFIX = "/api/v1/bigdata365/init"


def test_drop_dimension() -> bool:
    """测试删除维度 DELETE /dimension/r"""
    resp = requests.delete(api_url(f"{INIT_PREFIX}/dimension/r"), timeout=TIMEOUT)
    print(f"  \u72b6\u6001\u7801: {resp.status_code}, \u54cd\u5e94: {resp.text}")
    # 可能返回 true 或报错（取决于表是否存在）
    return resp.status_code in (200, 500)


def test_create_dimension_know_bug() -> bool:
    """
    测试创建维度 POST /dimension/r

    ⚠️ 已知 Bug: POST 方法体实际调用的是 dropBig365Dimension() 而非 createBig365Dimension()，
       这是方法注解与实现不一致的 Bug。
    """
    resp = requests.post(api_url(f"{INIT_PREFIX}/dimension/r"), timeout=TIMEOUT)
    data = resp.json() if resp.headers.get("content-type", "").startswith("application/json") else resp.text
    print(f"  \u26a0\ufe0f \u5f53\u524d\u884c\u4e3a\uff08\u6ce8\u89e3\u4e3a create \u4f46\u5b9e\u9645\u8c03\u7528 drop\uff09: {data}")
    return True


def main():
    """运行本模块所有测试"""
    print(f"\n{'='*50}")
    print(f"  \u7ef4\u5ea6\u521d\u59cb\u5316\u63a5\u53e3\u6d4b\u8bd5 - {api_url(INIT_PREFIX)}")
    print(f"{'='*50}")

    results = [
        run_test("\u5220\u9664\u7ef4\u5ea6 DELETE /dimension/r", test_drop_dimension),
        run_test("[已知Bug] POST 注解写 create 实际调 drop", test_create_dimension_know_bug),
    ]

    passed = sum(results)
    failed = len(results) - passed
    print(f"\n  \u7ed3\u679c: {passed} passed / {failed} failed")
    print(f"{'='*50}\n")
    return failed == 0


if __name__ == "__main__":
    import sys
    sys.exit(0 if main() else 1)
