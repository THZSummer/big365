import os
import time
import logging
import pytest
import requests
from pathlib import Path
from datetime import datetime
from playwright.sync_api import sync_playwright

WEB_URL = os.environ.get("WEB_URL", "http://localhost:13000")
API_URL = os.environ.get("BIG365_API_URL", "http://localhost:18080/api")

# Report infrastructure
TIMESTAMP = datetime.now().strftime("%Y%m%d_%H%M%S")
REPORT_DIR = Path(__file__).parent / "reports" / TIMESTAMP
REPORT_DIR.mkdir(parents=True, exist_ok=True)
SCREENSHOT_DIR = REPORT_DIR / "screenshots"
SCREENSHOT_DIR.mkdir(exist_ok=True)

LOG_FILE = REPORT_DIR / "test.log"
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler(LOG_FILE),
        logging.StreamHandler(),
    ],
)
logger = logging.getLogger("big365-web-test")
logger.info(f"Report directory: {REPORT_DIR}")
logger.info(f"WEB_URL: {WEB_URL}")

# Shared unique biz for tests that need a pre-existing business
SESSION_TS = int(time.time())
TEST_BIZ = f"web_test_{SESSION_TS}"


def _register_test_biz():
    """Register a test biz via backend API. Returns True if success or already exists."""
    r = requests.post(f"{API_URL}/biz/register", json={
        "bizName": TEST_BIZ,
        "bizLabel": "Web测试",
        "dimensions": [
            {"columnName": "a", "displayName": "应用", "leafMin": 1, "leafMax": 5},
            {"columnName": "b", "displayName": "接口", "leafMin": 1, "leafMax": 10},
        ],
        "dateRange": {"from": "20260101", "to": "20260103"},
    }, timeout=30)
    if r.status_code == 200:
        logger.info(f"Registered test biz: {TEST_BIZ}")
        return True
    data = r.json()
    if data.get("code") == "BIZ_ALREADY_EXISTS":
        logger.info(f"Test biz already exists: {TEST_BIZ}")
        return True
    logger.error(f"Failed to register test biz: {r.status_code} {r.text}")
    return False


# ── Playwright fixtures ──────────────────────────────────────────────


@pytest.fixture(scope="session")
def browser():
    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            executable_path="/snap/bin/chromium",
            args=["--no-sandbox", "--disable-gpu"],
        )
        yield browser
        browser.close()


@pytest.fixture
def page(browser):
    context = browser.new_context(
        viewport={"width": 1280, "height": 720},
    )
    page = context.new_page()
    yield page
    context.close()


@pytest.fixture
def biz_name():
    """Return a pre-registered test business name (for tests that need one)."""
    assert _register_test_biz(), "Test biz registration failed"
    return TEST_BIZ


# ── Auto-screenshot on every test (pass or fail) ──────────────────────


@pytest.fixture(autouse=True)
def auto_screenshot(request, page):
    """Take a screenshot after every test, tagged with pass/fail."""
    yield
    # Determine test result from the report
    outcome = "UNKNOWN"
    report = getattr(request.node, "_big365_report", None)
    if report is not None:
        outcome = "PASS" if report.passed else "FAIL"
    else:
        outcome = "DONE"

    safe_name = request.node.name.replace("/", "_").replace("[", "_").replace("]", "_")
    # Include the test module name to avoid collisions (e.g. two test_empty_state)
    module_name = request.node.parent.name.replace(".py", "")
    filename = f"{outcome}_{module_name}_{safe_name}.png"
    path = SCREENSHOT_DIR / filename
    try:
        page.screenshot(path=str(path), full_page=False)
        logger.info(f"  Screenshot: {path}")
    except Exception as e:
        logger.warning(f"  Screenshot failed: {e}")


# ── pytest hooks ─────────────────────────────────────────────────────


@pytest.hookimpl(tryfirst=True, hookwrapper=True)
def pytest_runtest_makereport(item, call):
    outcome = yield
    report = outcome.get_result()
    # Attach the call-phase report to the item for auto_screenshot to read
    if report.when == "call":
        item._big365_report = report
        if report.failed:
            logger.error(f"FAILED: {item.nodeid}")
            if call.excinfo:
                logger.error(f"  Exception: {call.excinfo.value}")


def pytest_configure(config):
    config.addinivalue_line("markers", "slow: slow running test")
    html_path = REPORT_DIR / "report.html"
    if not config.getoption("--html", default=None):
        config.option.htmlpath = str(html_path)
    config._big365_report_dir = REPORT_DIR


def pytest_unconfigure(config):
    logger.info(f"Test run complete. Reports: {REPORT_DIR}")
