"""
集成测试共享配置
=================
所有测试文件的公共配置和工具函数。

使用方法:
    pip install requests
    python test_xxx.py
"""

import os

# 基础配置
BASE_URL = os.getenv("BIG365_BASE_URL", "http://localhost:8081/big365")
TIMEOUT = int(os.getenv("BIG365_TIMEOUT", "10"))

# 测试数据
TEST_VECTOR_ID = 1  # 假设存在的测试数据 ID


def api_url(path: str) -> str:
    """拼接完整 API URL"""
    path = path.lstrip("/")
    return f"{BASE_URL}/{path}"


def print_result(name: str, status: bool, detail: str = ""):
    """统一打印测试结果"""
    icon = "\u2705" if status else "\u274c"
    msg = f"  {icon} {name}"
    if detail:
        msg += f" \u2192 {detail}"
    print(msg)
    return status


def run_test(name: str, fn, *args, **kwargs):
    """执行单个测试用例并返回结果"""
    try:
        result = fn(*args, **kwargs)
        return print_result(name, True, str(result))
    except Exception as e:
        return print_result(name, False, str(e))
