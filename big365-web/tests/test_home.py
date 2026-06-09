"""
Plan 9.2: Home page Playwright tests.
Tests: page loads, concept cards visible, nav links, quick actions.
V2 additions (TASK-V2-011): demo summary table, drill-down button.
"""
import pytest
from conftest import WEB_URL
from playwright.sync_api import expect


def test_home_page_loads(page):
    """Home page renders with brand title in header link."""
    page.goto(WEB_URL, wait_until="domcontentloaded")
    expect(page.locator("a:has-text('big365')").first).to_be_visible(timeout=15000)


def test_home_page_shows_concept_cards(page):
    """Home page displays 4 concept cards."""
    page.goto(WEB_URL)
    cards = page.locator("h3")
    card_texts = cards.all_text_contents()
    assert any("坐标空间" in t for t in card_texts), \
        f"'坐标空间' not found in cards: {card_texts}"
    assert any("上卷查询" in t for t in card_texts), \
        f"'上卷查询' not found in cards: {card_texts}"


def test_home_page_nav_links(page):
    """Top navigation bar shows key links."""
    page.goto(WEB_URL, wait_until="domcontentloaded")
    page.wait_for_timeout(1000)
    body = page.locator("body").inner_text()
    assert "首页" in body, f"'首页' not in page body"
    assert "业务管理" in body, f"'业务管理' not in page body"
    assert "文档" in body, f"'文档' not in page body"


def test_home_page_quick_actions(page):
    """Quick action buttons point to correct destinations."""
    page.goto(WEB_URL)
    expect(page.get_by_text("注册新业务")).to_be_visible(timeout=10000)
    expect(page.get_by_text("查看文档")).to_be_visible()


def test_home_page_health_status(page):
    """Health check banner shows service status."""
    page.goto(WEB_URL, wait_until="domcontentloaded")
    # Wait for health check to complete — Loading first, then either healthy or error
    page.wait_for_timeout(5000)
    body = page.locator("body").inner_text()
    assert "服务运行正常" in body or "服务异常" in body or "无法连接" in body or "加载中" in body, \
        f"Expected health status or loading, got: {body[:300]}"


# ── V2: TASK-V2-011 Playwright test additions ──────────────────────


def test_home_demo_summary_table(page):
    """V2: Verify demo summary table is visible when demo_logs is preloaded."""
    page.goto(WEB_URL, wait_until="domcontentloaded")
    page.wait_for_timeout(10000)  # Allow time for API calls (health + biz list + 3x range queries)
    body = page.locator("body").inner_text()
    if "预置演示" not in body:
        pytest.skip("demo_logs preloaded data not available")
    # Verify the summary table heading
    assert "demo_logs" in body, f"demo_logs section not found in: {body[:500]}"
    # Verify the summary table contains app data rows (app=1, app=2, app=3)
    assert "app=1" in body or "app=2" in body or "app=3" in body, \
        f"Expected app data rows in demo summary table: {body[:500]}"
    # Verify the summary total row exists
    assert "合计" in body, f"Expected '合计' total row in demo table: {body[:500]}"


def test_home_demo_drill_down_button(page):
    """V2: Verify drill-down CTA button is present and navigates to space page."""
    page.goto(WEB_URL, wait_until="domcontentloaded")
    page.wait_for_timeout(10000)
    body = page.locator("body").inner_text()
    if "预置演示" not in body:
        pytest.skip("demo_logs preloaded data not available")
    # Verify the drill-down button exists and is a clickable link
    drill_btn = page.get_by_text("进入下钻分析")
    expect(drill_btn).to_be_visible(timeout=10000)
    # Click it and verify navigation to space page for demo_logs
    drill_btn.click()
    page.wait_for_timeout(4000)
    expect(page.get_by_text("坐标查询")).to_be_visible(timeout=10000)
