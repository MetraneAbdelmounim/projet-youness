"""Shared headless browser used to drive the controller's web UI."""

import asyncio
import logging
import sys
import threading
from concurrent.futures import ThreadPoolExecutor

from playwright.sync_api import sync_playwright

import config

log = logging.getLogger(__name__)

# One worker, so every Playwright call lands on the same thread.
#
# The synchronous API is used deliberately in place of the async one: the async
# API drives the browser through asyncio.create_subprocess_exec, which raises
# NotImplementedError on Windows under a SelectorEventLoop — the loop uvicorn
# installs there. The sync API spawns the driver with plain subprocess, so it
# works regardless of the event-loop policy, on Windows and Linux alike.
#
# Playwright's sync objects are bound to the thread that created them, hence
# max_workers=1: it both pins them to one thread and serialises access.
_executor = ThreadPoolExecutor(max_workers=1, thread_name_prefix="playwright")
_lock = threading.Lock()

_playwright = None
_browser = None


def _ensure_browser():
    """Starts Chromium once and keeps it for the process lifetime."""
    global _playwright, _browser

    if _browser is not None and _browser.is_connected():
        return _browser

    if _playwright is None:
        # Playwright's sync driver builds its own loop with
        # asyncio.new_event_loop(), which follows the *global* policy. uvicorn
        # sets the Selector policy on Windows, and a SelectorEventLoop cannot
        # spawn the driver subprocess — NotImplementedError.
        #
        # Switching the policy here is safe: the server's loop already exists
        # and is unaffected, the policy only governs loops created afterwards,
        # and this runs on a single dedicated thread. No-op away from Windows.
        if sys.platform.startswith("win"):
            asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

        _playwright = sync_playwright().start()

    _browser = _playwright.chromium.launch(headless=True)
    log.info("Launched shared Chromium instance")
    return _browser


# The page's NetworkSave() writes whatever is currently in the form back to the
# device's Modbus registers. Clicking before NetworkLoad() has populated those
# fields would therefore write blanks over the live network configuration and
# strand the station. This predicate matches the *end* of NetworkLoad: the Save
# button is only enabled partway through, so button state alone is not enough —
# MBServerID is the last field it fills in.
# Written defensively: at domcontentloaded the forms and their fields do not
# exist yet, and a predicate that throws aborts the wait instead of retrying.
_FORM_READY = """
() => {
  const value = (form, field) => {
    const el = document.forms[form] && document.forms[form].elements[field];
    return el ? el.value : '';
  };
  const btns = document.forms.BTNS;
  const save = btns && btns.elements.BTNSave;
  if (!save || save.disabled) return false;
  // The IP is held as four per-octet inputs (IPAddrB0..IPAddrB3), not one field.
  for (let i = 0; i < 4; i++) {
    if (value('StaticIPForm', 'IPAddrB' + i) === '') return false;
  }
  return value('Settings', 'MBServerID') !== ''
      && value('Settings', 'HTTPPort') !== ''
      && value('Settings', 'MBIPPort') !== '';
}
"""


SAVE_CONFIRMED = "save completed successfully"


def _click_save_network(ip: str) -> list:
    """Presses Save and returns the dialog messages the page raised."""
    with _lock:
        dialogs = []
        browser = _ensure_browser()
        context = browser.new_context(ignore_https_errors=True)
        try:
            page = context.new_page()

            def on_dialog(dialog):
                dialogs.append(dialog.message)
                dialog.accept()

            # NetworkSave() raises modal dialogs; they must be accepted or
            # Playwright's default is to dismiss, which cancels the save.
            page.on("dialog", on_dialog)

            page.goto(
                f"http://{ip}:{config.EMC_HTTP_PORT}/network.html",
                timeout=config.REFRESH_TIMEOUT_MS,
                wait_until="domcontentloaded",
            )

            try:
                page.wait_for_function(_FORM_READY, timeout=config.REFRESH_TIMEOUT_MS)
            except Exception:
                # The device disables Save and explains why when DIP switch 1
                # locks the network settings. Surface that instead of a timeout.
                notice = page.evaluate(
                    "() => (document.getElementById('DisableMSG')?.innerText || '').trim()"
                )
                if notice:
                    raise RuntimeError(notice.replace("NOTICE: ", ""))
                raise RuntimeError(
                    "La page réseau de la station ne s'est pas initialisée à temps"
                )

            page.evaluate("document.getElementsByName('BTNSave')[0].click()")
            # Let the remaining dialogs and register writes drain.
            page.wait_for_timeout(3000)

            if not any(SAVE_CONFIRMED in m.lower() for m in dialogs):
                detail = " / ".join(m.replace("\n", " ") for m in dialogs) or "aucune réponse"
                raise RuntimeError(f"La station n'a pas confirmé l'enregistrement : {detail}")

            return dialogs
        finally:
            context.close()


def _close() -> None:
    global _playwright, _browser
    with _lock:
        if _browser is not None:
            _browser.close()
            _browser = None
        if _playwright is not None:
            _playwright.stop()
            _playwright = None


async def click_save_network(ip: str) -> list:
    """Opens the controller's network page and presses Save."""
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(_executor, _click_save_network, ip)


async def close() -> None:
    loop = asyncio.get_running_loop()
    try:
        await loop.run_in_executor(_executor, _close)
    finally:
        _executor.shutdown(wait=False)
