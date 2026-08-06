"""Shared headless browser used to drive the controller's web UI."""

import asyncio
import logging
from typing import Optional

from playwright.async_api import async_playwright

import config

log = logging.getLogger(__name__)

_playwright = None
_browser = None
_lock = asyncio.Lock()


async def _ensure_browser():
    """
    Starts Chromium once, on first use, and keeps it for the process lifetime.

    A browser was previously launched and torn down per request — roughly a
    second of startup on every refresh, just to click one button.
    """
    global _playwright, _browser

    if _browser is not None and _browser.is_connected():
        return _browser

    if _playwright is None:
        _playwright = await async_playwright().start()

    _browser = await _playwright.chromium.launch(headless=True)
    log.info("Launched shared Chromium instance")
    return _browser


async def click_save_network(ip: str) -> None:
    """Opens the controller's network page and presses Save."""
    async with _lock:
        browser = await _ensure_browser()
        context = await browser.new_context()
        try:
            page = await context.new_page()
            page.on("dialog", lambda dialog: asyncio.create_task(dialog.accept()))

            await page.goto(
                f"http://{ip}:{config.EMC_HTTP_PORT}/network.html",
                timeout=config.REFRESH_TIMEOUT_MS,
                wait_until="domcontentloaded",
            )
            await page.wait_for_selector("[name='BTNSave']", timeout=config.REFRESH_TIMEOUT_MS)
            await page.evaluate("document.getElementsByName('BTNSave')[0].click()")
            # Give the device a moment to accept the POST before the page closes.
            await page.wait_for_timeout(1000)
        finally:
            await context.close()


async def close() -> None:
    global _playwright, _browser
    if _browser is not None:
        await _browser.close()
        _browser = None
    if _playwright is not None:
        await _playwright.stop()
        _playwright = None
