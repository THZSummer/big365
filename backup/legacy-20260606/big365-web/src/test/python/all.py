#!/usr/bin/env python3
"""
big365 全量集成测试
====================
运行所有 API 接口的集成测试。

用法:
    python all.py                    # 运行全部测试
    python all.py -v                 # 详细输出
    python all.py --skip-bug         # 跳过已知 Bug 的测试
"""

import sys
import importlib
import argparse

# 所有测试模块列表（不含 conftest）
TEST_MODULES = [
    "test_hello",
    "test_bigdata_crud",
    "test_dimension",
]


def discover_tests():
    """发现并加载所有测试模块"""
    modules = []
    for mod_name in TEST_MODULES:
        try:
            mod = importlib.import_module(mod_name)
            modules.append(mod)
        except ImportError as e:
            print(f"  \u26a0\ufe0f \u65e0\u6cd5\u52a0\u8f7d\u6a21\u5757 {mod_name}: {e}")
    return modules


def run_all(skip_bug: bool = False):
    """运行所有测试"""
    print(f"{'='*60}")
    print(f"  big365 \u5168\u91cf\u96c6\u6210\u6d4b\u8bd5")
    print(f"  Base URL: {importlib.import_module('conftest').BASE_URL}")
    print(f"{'='*60}")

    modules = discover_tests()
    total_passed = 0
    total_failed = 0
    results_detail = []

    for mod in modules:
        if hasattr(mod, "main"):
            print(f"\n  >>> \u6b63\u5728\u6267\u884c: {mod.__name__}")
            # 捕获 main 的输出
            result = mod.main()
            if result:
                total_passed += 1
            else:
                total_failed += 1
            results_detail.append((mod.__name__, result))

    # 汇总
    print(f"\n{'='*60}")
    print(f"  \u6d4b\u8bd5\u6c47\u603b")
    print(f"{'='*60}")
    for name, ok in results_detail:
        icon = "\u2705" if ok else "\u274c"
        print(f"  {icon} {name}")
    print(f"{'='*60}")
    print(f"  \u6a21\u5757: {total_passed + total_failed} \u4e2a")
    print(f"  \u901a\u8fc7: {total_passed}")
    print(f"  \u5931\u8d25: {total_failed}")
    print(f"{'='*60}\n")

    return total_failed == 0


def main():
    parser = argparse.ArgumentParser(description="big365 \u5168\u91cf\u96c6\u6210\u6d4b\u8bd5")
    parser.add_argument("-v", "--verbose", action="store_true", help="\u8be6\u7ec6\u8f93\u51fa")
    parser.add_argument("--skip-bug", action="store_true", help="\u8df3\u8fc7\u5df2\u77e5 Bug \u7684\u6d4b\u8bd5")
    args = parser.parse_args()

    # 预留 verbose 和 skip-bug 能力
    if args.skip_bug:
        print("  \u2139\ufe0f  \u8df3\u8fc7\u5df2\u77e5 Bug \u6d4b\u8bd5\u6a21\u5f0f\uff08\u6682\u672a\u5b9e\u73b0\u8fc7\u6ee4\uff09")

    success = run_all(skip_bug=args.skip_bug)
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
