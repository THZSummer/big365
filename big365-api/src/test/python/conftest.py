import os
import time
import logging
import pytest
from pathlib import Path
from datetime import datetime

BASE_URL = os.environ.get("BIG365_API_URL", "http://localhost:18080/api")

# Shared unique business names to avoid state leaks across test runs.
# These are shared between test files (e.g. space_write + space_query both
# reference the same biz, so they must use the same constant).
SESSION_TS = int(time.time())
SPACE_BIZ_NAME = f"space_test_{SESSION_TS}"
DEMO_BIZ_NAME = f"demo_test_{SESSION_TS}"

TIMESTAMP = datetime.now().strftime("%Y%m%d_%H%M%S")
REPORT_DIR = Path(__file__).parent / "reports" / TIMESTAMP
REPORT_DIR.mkdir(parents=True, exist_ok=True)

LOG_FILE = REPORT_DIR / "test.log"
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler(LOG_FILE),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("big365-api-test")

logger.info(f"Report directory: {REPORT_DIR}")
logger.info(f"BASE_URL: {BASE_URL}")


@pytest.fixture(scope="session")
def base_url():
    """Return the base URL for the API under test."""
    return BASE_URL


@pytest.fixture
def api_url():
    """Return the API base URL (same as base_url, provided for convenience)."""
    return BASE_URL


@pytest.hookimpl(tryfirst=True, hookwrapper=True)
def pytest_runtest_makereport(item, call):
    """Capture response details on test failure."""
    outcome = yield
    report = outcome.get_result()
    if report.when == "call" and report.failed:
        logger.error(f"FAILED: {item.nodeid}")
        # Log the exception info if available
        if call.excinfo:
            logger.error(f"  Exception: {call.excinfo.value}")


def pytest_configure(config):
    """Register custom markers and set report path."""
    config.addinivalue_line("markers", "slow: slow running test")
    # Auto-set HTML report path into timestamped directory if not overridden
    html_path = REPORT_DIR / "report.html"
    if not config.getoption("--html", default=None):
        config.option.htmlpath = str(html_path)
    config._big365_report_dir = REPORT_DIR


def pytest_unconfigure(config):
    """Cleanup after test run."""
    logger.info(f"Test run complete. Reports: {REPORT_DIR}")
