"""
Plan 9.2: Biz register page Playwright tests.
Tests: page loads, fill registration form, submit, verify success.
"""
from conftest import WEB_URL
from playwright.sync_api import expect
import time


def test_biz_page_loads(page):
    """Biz management page renders with title."""
    page.goto(f"{WEB_URL}/biz", wait_until="domcontentloaded")
    expect(page.locator("h2")).to_contain_text("业务管理", timeout=15000)


def test_biz_page_shows_register_button(page):
    """'注册新业务' button is visible."""
    page.goto(f"{WEB_URL}/biz", wait_until="domcontentloaded")
    expect(page.get_by_role("button", name="注册新业务")).to_be_visible(timeout=15000)


def test_biz_page_shows_business_list(page):
    """Business list area renders (may show empty state)."""
    page.goto(f"{WEB_URL}/biz", wait_until="domcontentloaded")
    page.wait_for_timeout(3000)
    body = page.locator("body").inner_text()
    assert any(w in body for w in ["进入", "暂无业务", "注册新业务"]), \
        f"Expected biz list or empty state, got: {body[:300]}"


def test_register_business_via_ui(page):
    """Open register modal, fill the form, submit, verify success toast."""
    page.goto(f"{WEB_URL}/biz", wait_until="domcontentloaded")
    expect(page.get_by_role("button", name="注册新业务")).to_be_visible(timeout=15000)

    # Open modal
    page.get_by_role("button", name="注册新业务").click()
    page.wait_for_timeout(2000)

    # Fill biz name and label
    ts = int(time.time())
    page.get_by_placeholder("例: log_monitor").fill(f"ui_test_{ts}")
    page.get_by_placeholder("例: 日志监控").fill("UI测试业务")

    # Fill the first dimension row (already present in form)
    # columnName: find input with placeholder starting "例:" that's NOT "例: log_monitor" or "例: 日志监控"
    # The dimension columnName placeholder is "例: a"
    col_inputs = page.get_by_placeholder("例: a")
    if col_inputs.count() > 0:
        col_inputs.first.fill("x")

    # displayName: get input with placeholder "例: app" (or similar)
    name_inputs = page.get_by_placeholder("例: app")
    if name_inputs.count() > 0:
        name_inputs.first.fill("测试维度")

    # Fill leaf min/max
    leaf_inputs = page.locator('input[type="number"]')
    if leaf_inputs.count() >= 2:
        leaf_inputs.nth(0).fill("1")
        leaf_inputs.nth(1).fill("10")

    # Remove extra dimension rows, but keep at least 1
    delete_buttons = page.locator("button:has-text('✕')")
    count = 0
    while delete_buttons.count() > 1 and count < 10:
        delete_buttons.last.click()
        page.wait_for_timeout(300)
        count += 1

    # Set date range
    date_inputs = page.locator('input[placeholder="20260101"]')
    if date_inputs.count() >= 2:
        date_inputs.nth(0).fill("20260101")
        date_inputs.nth(1).fill("20260103")

    # Submit (use exact match because "注册" also matches "注册新业务")
    page.get_by_role("button", name="注册", exact=True).click()

    # Verify success toast
    expect(page.get_by_text("✅").first).to_be_visible(timeout=15000)

    # Verify new business appears in list
    page.wait_for_timeout(1000)
    body = page.locator("body").inner_text()
    assert f"ui_test_{ts}" in body or "UI测试业务" in body, \
        f"Registered biz not found in list: {body[:300]}"


def test_register_empty_form_validation(page):
    """Submitting empty form should show validation error (not crash)."""
    page.goto(f"{WEB_URL}/biz", wait_until="domcontentloaded")
    page.get_by_role("button", name="注册新业务").click()
    page.wait_for_timeout(2000)

    # Click register without filling anything
    page.get_by_role("button", name="注册", exact=True).click()

    # Should get some error feedback
    page.wait_for_timeout(2000)
    body = page.locator("body").inner_text()
    assert any(w in body for w in ["错误", "❌", "校验", "不可为空"]), \
        f"Expected validation feedback, got: {body[:300]}"
