"""
欢迎页接口测试
==============
测试 GET /big365/ 欢迎页接口

独立运行:
    python test_hello.py
"""

import requests
from conftest import BASE_URL, TIMEOUT, api_url, print_result, run_test


def test_welcome() -> bool:
    """测试欢迎页接口 GET /"""
    resp = requests.get(api_url("/"), timeout=TIMEOUT)
    assert resp.status_code == 200, f"\u72b6\u6001\u7801\u5f02\u5e38: {resp.status_code}"
    assert resp.text == "Hello Bigdata365!", f"\u54cd\u5e94\u5185\u5bb9\u5f02\u5e38: {resp.text}"
    return True


def test_welcome_headers() -> bool:
    """测试欢迎页响应头"""
    resp = requests.get(api_url("/"), timeout=TIMEOUT)
    assert resp.status_code == 200
    content_type = resp.headers.get("Content-Type", "")
    assert "text/plain" in content_type or "text/html" in content_type, \
        f"Content-Type \u5f02\u5e38: {content_type}"
    return True


def main():
    """运行本模块所有测试"""
    print(f"\n{'='*50}")
    print(f"  \u6b22\u8fce\u9875\u63a5\u53e3\u6d4b\u8bd5 - {api_url('/')}")
    print(f"{'='*50}")

    results = [
        run_test("\u6b22\u8fce\u9875\u8fd4\u56de Hello Bigdata365!", test_welcome),
        run_test("\u6b22\u8fce\u9875\u54cd\u5e94\u5934\u9a8c\u8bc1", test_welcome_headers),
    ]

    passed = sum(results)
    failed = len(results) - passed
    print(f"\n  \u7ed3\u679c: {passed} passed / {failed} failed")
    print(f"{'='*50}\n")
    return failed == 0


if __name__ == "__main__":
    import sys
    sys.exit(0 if main() else 1)
