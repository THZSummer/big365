"""
Plan 9.2: Dimensions page Playwright tests.
Tests: dimension list loading, create modal, disable operation.
"""
from conftest import WEB_URL
from playwright.sync_api import expect


def test_dimension_list_loads(page, biz_name):
    """Navigate to dimensions page and verify the table renders with initial dimensions."""
    page.goto(f"{WEB_URL}/biz/{biz_name}/dimensions", wait_until="domcontentloaded")
    page.wait_for_timeout(3000)

    # Verify the 2 initial dimensions appear (columnName: a, b)
    body = page.locator("body").inner_text()
    assert "a" in body, f"Dimension 'a' not found on page"
    assert "b" in body, f"Dimension 'b' not found on page"

    # Verify table headers
    expect(page.get_by_text("列名").first).to_be_visible(timeout=5000)
    expect(page.get_by_text("取值范围").first).to_be_visible()

    # Verify status badges
    expect(page.get_by_text("启用").first).to_be_visible()


def test_create_dimension(page, biz_name):
    """Click '新增维度' button, fill the form, submit, and verify success."""
    page.goto(f"{WEB_URL}/biz/{biz_name}/dimensions", wait_until="domcontentloaded")
    page.wait_for_timeout(3000)

    # Open create modal
    page.get_by_role("button", name="新增维度").click()
    page.wait_for_timeout(2000)

    # Fill form using get_by_placeholder with exact match
    page.get_by_placeholder("例: a").first.fill("c")
    page.get_by_placeholder("例: app").first.fill("状态码")
    page.get_by_placeholder("可选，维度说明").fill("HTTP status code")

    # Fill leaf min/max
    leaf_inputs = page.locator('input[type="number"]')
    leaf_inputs.nth(0).fill("1")
    leaf_inputs.nth(1).fill("500")

    # Submit
    page.get_by_role("button", name="创建").click()

    # Verify success toast
    expect(page.get_by_text("✅").first).to_be_visible(timeout=15000)


def test_edit_dimension(page, biz_name):
    """Edit a dimension's display name via the edit modal."""
    page.goto(f"{WEB_URL}/biz/{biz_name}/dimensions", wait_until="domcontentloaded")
    page.wait_for_timeout(3000)

    # Click "编辑" button on the first dimension row
    page.locator("button:has-text('编辑')").first.click()
    page.wait_for_timeout(2000)

    # Verify modal opened (look for "保存" button)
    expect(page.get_by_role("button", name="保存", exact=True)).to_be_visible(timeout=5000)

    # Try to update display name - look for any text input in the modal
    # The modal has "displayName" input and "description" input
    text_inputs = page.locator('input[type="text"]')
    if text_inputs.count() >= 1:
        text_inputs.first.clear()
        text_inputs.first.fill("已更新显示名")

    # Save
    page.get_by_role("button", name="保存", exact=True).click()

    # Verify toast
    expect(page.get_by_text("✅").first).to_be_visible(timeout=15000)


def test_disable_dimension(page, biz_name):
    """Disable a dimension via two-step confirmation."""
    page.goto(f"{WEB_URL}/biz/{biz_name}/dimensions", wait_until="domcontentloaded")
    page.wait_for_timeout(3000)

    # Click first "禁用" button
    page.locator("button:has-text('禁用')").first.click()

    # Verify it changes to "确认禁用" (two-step confirmation)
    expect(page.get_by_text("确认禁用", exact=True)).to_be_visible(timeout=5000)

    # Click confirm
    page.get_by_text("确认禁用", exact=True).click()

    # Verify toast
    expect(page.get_by_text("✅").first).to_be_visible(timeout=15000)


def test_empty_state(page):
    """Visiting dimensions page with no selected biz shows BizSelector only."""
    page.goto(f"{WEB_URL}/biz/", wait_until="domcontentloaded")
    page.wait_for_timeout(2000)
    body = page.locator("body").inner_text()
    assert "业务管理" in body, f"Expected biz page, got: {body[:200]}"
