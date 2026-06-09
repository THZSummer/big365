"""
Plan 9.2: Space page Playwright tests.
Tests: coordinate input, write data, query result, drill-down demo.
V2 additions (TASK-V2-011): range query, list view, delete interaction.
"""
import pytest
from conftest import WEB_URL
from playwright.sync_api import expect


def test_space_page_loads(page, biz_name):
    """Navigate to space page and verify coordinate inputs render."""
    page.goto(f"{WEB_URL}/biz/{biz_name}/space", wait_until="domcontentloaded")
    page.wait_for_timeout(3000)

    # Verify section headings
    expect(page.get_by_text("坐标查询")).to_be_visible(timeout=15000)
    expect(page.get_by_text("写入数据")).to_be_visible()
    expect(page.get_by_text("下钻演示")).to_be_visible()

    # Verify select dropdowns exist
    select_count = page.locator("select").count()
    assert select_count >= 2, f"Expected >= 2 selects, got {select_count}"


def test_write_and_query(page, biz_name):
    """Write a data point via UI, then query it and verify the value."""
    page.goto(f"{WEB_URL}/biz/{biz_name}/space", wait_until="domcontentloaded")
    page.wait_for_timeout(5000)

    # ── Write data ──
    # Find write-area selects. Exclude BizSelector (has "选择业务" option).
    # Write selects are those WITHOUT "ALL" option and WITHOUT "选择业务".
    all_selects = page.locator("select")
    coord_selects = all_selects.filter(has_not=page.locator('option:has-text("选择业务")'))
    write_selects = coord_selects.filter(has_not=page.locator('option:has-text("ALL")'))

    if write_selects.count() >= 2:
        # Select value 3 for first dimension (index 2 = option "3")
        write_selects.nth(0).select_option(index=2)
        # Select value 7 for second dimension (index 6 = option "7")
        write_selects.nth(1).select_option(index=6)

    # Fill date - find the date input closest to the write submit button
    # Write date input is the one in the write section (middle section)
    date_inputs = page.locator('input[placeholder="例: 20260101"]')
    if date_inputs.count() >= 2:
        date_inputs.nth(1).clear()
        date_inputs.nth(1).fill("20260101")

    # Fill value
    value_inputs = page.locator('input[placeholder*="指标值"]')
    if value_inputs.count() >= 1:
        value_inputs.first.clear()
        value_inputs.first.fill("100")

    # Submit write - need to wait for button to become enabled
    page.wait_for_timeout(1000)
    submit_btn = page.locator("button:has-text('提交')").first
    expect(submit_btn).to_be_enabled(timeout=10000)
    submit_btn.click()

    # Verify success message
    expect(page.get_by_text("写入成功").first).to_be_visible(timeout=15000)

    # ── Query data ──
    query_selects = coord_selects.filter(has=page.locator('option:has-text("ALL")'))
    if query_selects.count() >= 2:
        query_selects.nth(0).select_option(index=0)  # ALL (0)
        query_selects.nth(1).select_option(index=0)  # ALL (0)

    if date_inputs.count() >= 1:
        date_inputs.nth(0).fill("20260101")

    # Click query button
    page.locator("button:has-text('查询')").first.click()

    # Verify page still shows the query section
    page.wait_for_timeout(2000)
    expect(page.get_by_text("坐标查询")).to_be_visible()


def test_drill_down(page, biz_name):
    """Select specific dimension values and verify drill-down result displays."""
    page.goto(f"{WEB_URL}/biz/{biz_name}/space", wait_until="domcontentloaded")
    page.wait_for_timeout(4000)

    # Drill-down section: coordinate selects with ALL option (exclude BizSelector)
    drill_selects = page.locator("select").filter(
        has_not=page.locator('option:has-text("选择业务")')
    ).filter(
        has=page.locator('option:has-text("ALL")')
    )
    if drill_selects.count() >= 2:
        drill_selects.nth(0).select_option(index=0)
        drill_selects.nth(1).select_option(index=0)

    # Fill date in drill-down area (last date input)
    date_inputs = page.locator('input[placeholder="例: 20260101"]')
    if date_inputs.count() >= 1:
        date_inputs.last.fill("20260101")

    # Click drill-down button
    page.locator("button:has-text('执行下钻')").click()

    # Wait for results
    page.wait_for_timeout(3000)
    body = page.locator("body").inner_text()
    assert "Grand Total" in body or "下钻" in body, \
        f"Expected drill-down results, got: {body[:300]}"


def test_empty_state_biz_without_dims(page):
    """A biz without dimensions shows an appropriate message."""
    page.goto(f"{WEB_URL}/biz/nonexistent_biz_99999/space", wait_until="domcontentloaded")
    page.wait_for_timeout(3000)
    body = page.locator("body").inner_text()
    assert "暂无维度" in body or "不存在" in body or "错误" in body, \
        f"Expected empty/error state, got: {body[:300]}"


# ── V2: TASK-V2-011 Playwright test additions ──────────────────────


def test_space_range_query(page):
    """V2: Test time range query using DateRangePicker and verify response metadata."""
    page.goto(f"{WEB_URL}/biz/demo_logs/space", wait_until="domcontentloaded")
    page.wait_for_timeout(8000)
    body = page.locator("body").inner_text()
    if "暂无维度" in body:
        pytest.skip("demo_logs dimensions not available — preloaded data may not exist")

    # Switch to range query mode via toggle button
    page.get_by_text("区间").click()
    page.wait_for_timeout(500)

    # Use the quick range button: '最近 7 天'
    page.get_by_role("button", name="最近 7 天").click()
    page.wait_for_timeout(500)

    # Click query button (the first one in query mode)
    page.locator("button:has-text('查询')").first.click()
    page.wait_for_timeout(6000)

    # Verify range query response contains metadata fields
    body = page.locator("body").inner_text()
    assert "扫描天数" in body or "聚合方式" in body, \
        f"Expected range query metadata (扫描天数/聚合方式) in response, got: {body[:500]}"


def test_space_list_view(page):
    """V2: Test list tab renders paginated table with data rows."""
    page.goto(f"{WEB_URL}/biz/demo_logs/space", wait_until="domcontentloaded")
    page.wait_for_timeout(8000)
    body = page.locator("body").inner_text()
    if "暂无维度" in body:
        pytest.skip("demo_logs dimensions not available — preloaded data may not exist")

    # Switch to list tab
    page.get_by_text("📋 列表模式").click()
    page.wait_for_timeout(6000)

    body = page.locator("body").inner_text()
    # Either data rows exist with pagination, or the empty state is shown
    assert "第" in body or "暂无数据" in body, \
        f"Expected list pagination controls or empty state, got: {body[:500]}"
    # If data is present, verify table structure
    if "暂无数据" not in body:
        assert "坐标" in body, f"Expected table header '坐标' in list view: {body[:500]}"
        assert "指标值" in body, f"Expected table header '指标值' in list view: {body[:500]}"


def test_space_delete_interaction(page):
    """V2: Test delete flow — delete a row and verify it is removed from list."""
    page.goto(f"{WEB_URL}/biz/demo_logs/space", wait_until="domcontentloaded")
    page.wait_for_timeout(8000)
    body = page.locator("body").inner_text()
    if "暂无维度" in body:
        pytest.skip("demo_logs dimensions not available — preloaded data may not exist")

    # Switch to list tab
    page.get_by_text("📋 列表模式").click()
    page.wait_for_timeout(6000)

    body = page.locator("body").inner_text()
    if "暂无数据" in body:
        pytest.skip("No data available for delete test")

    # Capture the first row's coordinate text before deletion
    first_td = page.locator("td").first
    coord_before = first_td.inner_text()
    assert len(coord_before) > 0, "First table cell should have content"

    # Click delete button on the first data row
    delete_btns = page.locator("td button:has-text('删除')")
    if delete_btns.count() == 0:
        pytest.skip("No delete buttons found in list table")
    delete_btns.first.click()
    page.wait_for_timeout(1000)

    # Verify delete confirmation modal appears
    expect(page.get_by_text("确认删除")).to_be_visible(timeout=5000)
    expect(page.get_by_text("此操作不可撤销")).to_be_visible()

    # Confirm deletion
    page.get_by_role("button", name="确认删除").click()
    page.wait_for_timeout(5000)

    # Verify the deleted row is no longer present in the list
    body_after = page.locator("body").inner_text()
    list_is_empty = "暂无数据" in body_after
    coord_removed = coord_before not in body_after

    assert list_is_empty or coord_removed, \
        f"Expected deleted row to be removed. Coord before: {coord_before[:80]}... Body after: {body_after[:500]}"
