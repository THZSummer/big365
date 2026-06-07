from conftest import BASE_URL
import pytest
from playwright.sync_api import expect



def test_biz_page_loads(page):
    page.goto(f"{BASE_URL}/biz")
    expect(page.locator("h2")).to_contain_text("业务管理")
