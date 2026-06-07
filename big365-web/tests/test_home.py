import os
import pytest
from playwright.sync_api import expect

BASE_URL = os.environ.get("WEB_URL", "http://localhost:3000")


def test_home_page_loads(page):
    page.goto(BASE_URL)
    expect(page.locator("h1")).to_contain_text("big365")


def test_home_page_shows_concept_cards(page):
    page.goto(BASE_URL)
    cards = page.locator("h3")
    card_texts = cards.all_text_contents()
    assert any("坐标空间" in t for t in card_texts)
