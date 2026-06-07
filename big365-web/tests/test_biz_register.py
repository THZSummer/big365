import os
import pytest
from playwright.sync_api import expect

BASE_URL = os.environ.get("WEB_URL", "http://localhost:3000")


def test_biz_page_loads(page):
    page.goto(f"{BASE_URL}/biz")
    expect(page.locator("h2")).to_contain_text("业务管理")
