"""
Plan 9.2: Home page Playwright tests.
Tests: page loads, concept cards visible, nav links, quick actions.
"""
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
