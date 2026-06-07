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
        # Use system chromium (installed via snap) since Playwright 1.60
        # does not support automatic browser install on Ubuntu 26.04
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


# ── pytest hooks ─────────────────────────────────────────────────────


@pytest.hookimpl(tryfirst=True, hookwrapper=True)
def pytest_runtest_makereport(item, call):
    outcome = yield
    report = outcome.get_result()
    if report.when == "call" and report.failed:
        logger.error(f"FAILED: {item.nodeid}")
        if call.excinfo:
            logger.error(f"  Exception: {call.excinfo.value}")
        # Capture screenshot on failure
        page = item.funcargs.get("page")
        if page:
            try:
                path = SCREENSHOT_DIR / f"{item.name}.png"
                page.screenshot(path=str(path))
                logger.info(f"  Screenshot saved: {path}")
            except Exception as e:
                logger.warning(f"  Screenshot failed: {e}")


def pytest_configure(config):
    config.addinivalue_line("markers", "slow: slow running test")
    html_path = REPORT_DIR / "report.html"
    if not config.getoption("--html", default=None):
        config.option.htmlpath = str(html_path)
    config._big365_report_dir = REPORT_DIR


def pytest_unconfigure(config):
    logger.info(f"Test run complete. Reports: {REPORT_DIR}")
