"""Opt-in real Chromium checks: RUN_CHROMIUM_TESTS=1, including in the final image.

Only loopback fixture traffic is allowed by the harness. These tests do not use
Google credentials, live services, or a mocked browser.
"""
import base64
import json
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from io import BytesIO
import os
from pathlib import Path
import threading
import time
import unicodedata

from PIL import Image
from playwright.sync_api import BrowserType, Page
from pypdf import PdfReader
import pytest

from app.converters.html_converter import ConversionError, HtmlConverter

pytestmark = pytest.mark.skipif(
    os.environ.get('RUN_CHROMIUM_TESTS') != '1',
    reason='Requires the installed Chromium runtime; opt in inside the backend image',
)


def live_chromium_pids():
    pids = set()
    for process in Path('/proc').glob('[0-9]*'):
        try:
            if Path(os.readlink(process / 'exe')).name in {'chrome', 'chrome-headless-shell', 'chrome_crashpad_handler'}:
                pids.add(process.name)
        except (OSError, PermissionError):
            pass
    return pids


@pytest.fixture
def observed_browser(monkeypatch):
    """Observe real launches to assert cleanup after success and forced failure."""
    before = live_chromium_pids()
    browsers = []
    launch = BrowserType.launch

    def observed_launch(self, *args, **kwargs):
        browser = launch(self, *args, **kwargs)
        browsers.append(browser)
        return browser

    monkeypatch.setattr(BrowserType, 'launch', observed_launch)
    yield browsers
    assert browsers, 'The real browser was never launched'
    assert all(not browser.is_connected() for browser in browsers)
    deadline = time.monotonic() + 3
    while live_chromium_pids() - before and time.monotonic() < deadline:
        time.sleep(0.05)
    assert not live_chromium_pids() - before, 'Chromium processes leaked after conversion'


def inline_png():
    image = BytesIO()
    Image.new('RGB', (10, 10), 'red').save(image, format='PNG')
    return 'data:image/png;base64,' + base64.b64encode(image.getvalue()).decode()


def test_html_pdf_real_chromium_text_table_raster_and_no_asset_requests(tmp_path, observed_browser):
    hits = []

    class Handler(BaseHTTPRequestHandler):
        def do_GET(self):
            hits.append(self.path)
            payload = b'UNEXPECTED_REMOTE_CONTENT'
            self.send_response(200)
            self.end_headers()
            self.wfile.write(payload)

        def log_message(self, *args):
            pass

    server = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
    worker = threading.Thread(target=server.serve_forever, daemon=True)
    worker.start()
    url = f'http://127.0.0.1:{server.server_port}'
    local = tmp_path / 'private-fixture.html'
    local.write_text('<h1>PRIVATE_FILE_SENTINEL</h1>')
    output = tmp_path / 'chromium-policy.pdf'
    eps = 'data:image/x-eps;base64,' + base64.b64encode(b'%!PS-Adobe-3.0 EPSF-3.0').decode()
    svg = 'data:image/svg+xml;base64,' + base64.b64encode(
        f'<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><script>fetch("{url}/svg-script")</script><image href="{url}/svg-nested.png"/></svg>'.encode()).decode()
    html = f'''<!DOCTYPE html><html><head><meta charset="utf-8">
    <link rel="stylesheet" href="{url}/style.css">
    <style>@font-face {{font-family:Remote;src:url('{url}/font.woff2')}}
    .remote {{font-family:Remote;background-image:url('{url}/background.png')}}</style>
    </head><body><h1>Security conversion fixture</h1>
    <p class="remote">Unicode café Ω</p><table><tr><th>Item</th><th>Count</th></tr>
    <tr><td>Apples</td><td>2</td></tr></table>
    <img src="{inline_png()}"><img src="{url}/remote.png">
    <img src="{url}/image.eps"><img src="{url}/image.svg"><img src="{eps}">
    <img src="{svg}">
    <img src="data:image/png;base64,JSFQUy1BZG9iZQ==">
    <iframe src="{local.as_uri()}"></iframe><img src="{local.as_uri()}">
    <script src="{url}/script.js"></script>
    <script>document.body.insertAdjacentHTML('beforeend','<p>SCRIPT_EXECUTED</p>');
    fetch('{url}/fetch');new WebSocket('ws://127.0.0.1:{server.server_port}/socket');
    navigator.serviceWorker.register('{url}/worker.js');</script>
    </body></html>'''
    try:
        HtmlConverter().convert_to_pdf(html, str(output))
        # Preserve the real PDF even if an assertion below identifies a regression.
        if directory := os.environ.get('PDF_TEST_ARTIFACTS'):
            Path(directory, 'chromium-policy.pdf').write_bytes(output.read_bytes())
        reader = PdfReader(output)
        text = unicodedata.normalize('NFKC', '\n'.join(page.extract_text() for page in reader.pages))
        assert 'Security conversion fixture' in text
        assert 'Apples' in text and 'Count' in text
        assert 'café' in text and 'Ω' in text
        assert 'SCRIPT_EXECUTED' not in text
        assert 'PRIVATE_FILE_SENTINEL' not in text
        assert 'UNEXPECTED_REMOTE_CONTENT' not in text
        assert not hits, f'Chromium contacted the fixture server: {hits}'
        images = [image.image.convert('RGB') for page in reader.pages for image in page.images]
        # Chromium may embed a broken-resource icon for intentionally denied assets.
        # Assert the supported raster's actual pixels rather than counting all XObjects.
        def is_inline_red_fixture(image):
            red, green, blue = image.getpixel((image.width // 2, image.height // 2))
            return image.size == (10, 10) and red > 240 and green < 10 and blue < 10

        assert sum(is_inline_red_fixture(image) for image in images) == 1
        if directory := os.environ.get('PDF_TEST_ARTIFACTS'):
            evidence = {'fixture_http_hits': hits, 'images': [
                {'size': image.size, 'center_rgb': image.getpixel((image.width // 2, image.height // 2))}
                for image in images]}
            Path(directory, 'chromium-policy.json').write_text(json.dumps(evidence, indent=2))
    finally:
        server.shutdown()
        server.server_close()
        worker.join(timeout=2)


def test_html_pdf_real_chromium_browser_cleanup_on_pdf_failure(tmp_path, observed_browser, monkeypatch):
    def fail_pdf(self, *args, **kwargs):
        assert self.locator('h1').inner_text() == 'Failure fixture'
        raise OSError('fixture-only PDF write failure')

    monkeypatch.setattr(Page, 'pdf', fail_pdf)
    with pytest.raises(ConversionError, match='fixture-only PDF write failure'):
        HtmlConverter().convert_to_pdf('<h1>Failure fixture</h1>', str(tmp_path / 'failed.pdf'))
    assert not (tmp_path / 'failed.pdf').exists()
