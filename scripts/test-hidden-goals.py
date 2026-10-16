"""Run through webapp-testing/with_server.py against a production build."""

import argparse
import json
from pathlib import Path

from playwright.sync_api import expect, sync_playwright


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-url", required=True)
    args = parser.parse_args()
    base_url = args.base_url.rstrip("/")
    root = Path(__file__).resolve().parents[1]
    journal = json.loads((root / "src/assets/static/json/goals.json").read_text())
    tenets = json.loads((root / "src/assets/static/json/tenets.json").read_text())
    private_ids = {
        tenet["id"]
        for tenet in tenets
        if "private" in [tag.strip().lower() for tag in tenet.get("tags", [])]
    }

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        context = browser.new_context(base_url=base_url)
        try:
            for path in ("/goals", "/api/goals"):
                response = context.request.get(path)
                assert response.status == 404, (path, response.status)
                for entry in journal:
                    assert entry["title"] not in response.text()

            response = context.request.post(
                "/api/goals", data={"goal": "A goal that must not reach a paid model"}
            )
            assert response.status == 404, response.status

            search_response = context.request.get("/api/search")
            assert search_response.status == 200
            search_items = search_response.json()["items"]
            assert not any(item["path"] == "/goals" for item in search_items)
            assert any(item["path"] == "/tenets" for item in search_items)

            openapi_response = context.request.get("/api/openapi")
            assert openapi_response.status == 200
            openapi = openapi_response.json()
            assert "/api/goals" not in openapi["paths"]
            assert "/api/tenets" in openapi["paths"]
            assert "/api/decisions" in openapi["paths"]
            assert not any("Goal" in key for key in openapi["components"]["schemas"])

            llms_response = context.request.get("/llms.txt")
            assert llms_response.status == 200
            assert "/goals" not in llms_response.text()

            public_response = context.request.get("/api/tenets")
            assert public_response.status == 200
            assert not private_ids.intersection(
                tenet["id"] for tenet in public_response.json()["tenets"]
            )
            assert context.request.get("/api/decisions").status == 401

            page = context.new_page()
            page.set_viewport_size({"width": 1440, "height": 1000})
            response = page.goto("/", wait_until="networkidle")
            assert response.status == 200
            nav = page.get_by_role("navigation", name="Primary navigation", exact=True)
            expect(nav).to_be_visible()
            expect(page.locator('a[href="/goals"]')).to_have_count(0)
            expect(nav.get_by_role("link", name="About", exact=True)).to_be_visible()
            nav.get_by_role("button", name="Writings").click()
            writings = page.locator("#desktop-writings-menu")
            expect(writings).to_be_visible()
            expect(writings.get_by_role("menuitem", name="Tenets")).to_be_visible()
            page.keyboard.press("Escape")

            nav.get_by_role("button", name="Open search").click()
            search = page.get_by_placeholder("Search articles, notes, bookmarks, learnings...")
            expect(search).to_be_visible()
            search.fill("goals")
            expect(page.locator('[cmdk-item][data-value="page-goals"]')).to_have_count(0)
            search.fill("Tenets")
            expect(page.locator('[cmdk-item][data-value="page-tenets"]')).to_be_visible()
            page.keyboard.press("Escape")

            page.set_viewport_size({"width": 390, "height": 844})
            page.get_by_role("button", name="Open menu", exact=True).click()
            menu = page.get_by_role("dialog", name="Site navigation")
            expect(menu).to_be_visible()
            expect(menu.locator('a[href="/goals"]')).to_have_count(0)
            expect(menu.get_by_role("link", name="Tenets", exact=True)).to_be_visible()
            expect(menu.get_by_role("link", name="About", exact=True)).to_be_visible()
            menu.get_by_role("button", name="Close menu", exact=True).click()
            expect(menu).not_to_be_visible()

            response = page.goto("/goals", wait_until="networkidle")
            assert response.status == 404
            expect(page.get_by_text("404", exact=True)).to_be_visible()

            response = page.goto("/articles/python-threading-primitives-and-queues", wait_until="networkidle")
            assert response.status == 200
            article = page.locator("article")
            inline = article.locator("code:not(pre code)").first
            expect(inline).to_be_visible()
            assert inline.evaluate("node => getComputedStyle(node).display") == "inline"
            block = article.locator("pre").first
            expect(block.locator("code")).to_be_visible()
            expect(block.locator("..").get_by_role("button", name="Copy", exact=True)).to_be_visible()
            print("PASS: Goals page/API return 404; menus, search, and agent docs omit Goals; other navigation and API privacy still work.")
        finally:
            context.close()
            browser.close()


if __name__ == "__main__":
    main()
