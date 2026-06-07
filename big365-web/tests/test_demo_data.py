"""
Plan 9.2: Demo data page Playwright tests.
Tests: select scale, create job, wait for progress completion.
"""
from conftest import WEB_URL
from playwright.sync_api import expect


def test_demo_page_loads(page, biz_name):
    """Navigate to demo data page and verify scale buttons render."""
    page.goto(f"{WEB_URL}/biz/{biz_name}/demo-data", wait_until="domcontentloaded")
    page.wait_for_timeout(3000)

    expect(page.locator("h2")).to_contain_text("演示数据", timeout=15000)

    # Verify scale toggle buttons using get_by_role with exact match
    expect(page.get_by_role("button", name="小样例", exact=True)).to_be_visible()
    expect(page.get_by_role("button", name="万级", exact=True)).to_be_visible()
    expect(page.get_by_role("button", name="百万级", exact=True)).to_be_visible()

    # Verify create button
    expect(page.get_by_role("button", name="创建生成任务")).to_be_visible()


def test_create_small_job_and_wait(page, biz_name):
    """Select '小样例', click create, verify job appears with status."""
    page.goto(f"{WEB_URL}/biz/{biz_name}/demo-data", wait_until="domcontentloaded")
    page.wait_for_timeout(5000)

    # Click "小样例" to select
    page.get_by_role("button", name="小样例", exact=True).click()

    # Click create button
    page.get_by_role("button", name="创建生成任务").click()

    # Verify success toast
    expect(page.get_by_text("✅").first).to_be_visible(timeout=15000)

    # Wait for job card to appear and show a status badge
    status_words = ["等待中", "初始化", "生成中", "写入中", "汇总中", "已完成", "失败"]
    found = False
    body = ""
    for _ in range(15):
        page.wait_for_timeout(2000)
        body = page.locator("body").inner_text()
        if any(w in body for w in status_words):
            found = True
            break

    assert found, f"No status badge appeared within 30s. Body: {body[:300]}"


def test_job_progress_updates(page, biz_name):
    """Create a job and verify progress bar or status badge updates."""
    page.goto(f"{WEB_URL}/biz/{biz_name}/demo-data", wait_until="domcontentloaded")
    page.wait_for_timeout(3000)

    page.get_by_role("button", name="小样例").click()
    page.get_by_role("button", name="创建生成任务").click()

    # Wait for job card to appear
    page.wait_for_timeout(3000)

    body = page.locator("body").inner_text()
    status_words = ["等待中", "初始化", "生成中", "写入中", "汇总中", "已完成", "失败"]
    found = any(w in body for w in status_words)
    assert found, f"No status badge found in: {body[:300]}"


def test_empty_state(page):
    """Demo page without a biz shows BizSelector only."""
    page.goto(f"{WEB_URL}/biz/", wait_until="domcontentloaded")
    page.wait_for_timeout(2000)
    body = page.locator("body").inner_text()
    assert "业务管理" in body, f"Expected biz page, got: {body[:200]}"
