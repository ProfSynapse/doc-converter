"""Opt-in browser tests of the frontend image, with all application APIs mocked.

Run the backend test runner with --network container:<offline-frontend-container>
and FRONTEND_TEST_URL=http://127.0.0.1:3000. No live OAuth or client-site traffic.
"""
import base64
import hashlib
import hmac
import json
import os
import time
from urllib.parse import urlsplit, parse_qs

from playwright.sync_api import sync_playwright, expect
import pytest

URL = os.environ.get('FRONTEND_TEST_URL', '')
pytestmark = pytest.mark.skipif(not URL, reason='Requires an isolated frontend final image')


@pytest.fixture
def ui():
    calls = []
    settings = {'authenticated': True, 'fail_stats': False, 'unauthorized': False}
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        context = browser.new_context(service_workers='block')

        def route_request(route):
            request = route.request
            parsed = urlsplit(request.url)
            if parsed.netloc != urlsplit(URL).netloc:
                route.abort()
                return
            path = parsed.path
            if path == '/api/config':
                route.fulfill(json={'flaskApiUrl': URL})
            elif path == '/auth/status':
                route.fulfill(json={'authenticated': settings['authenticated']})
            elif path == '/api/convert':
                calls.append(('convert', request.post_data))
                route.fulfill(json={'job_id': 'fixture-only', 'formats': {'pdf': {'download_url': '/fixture'}}})
            elif path.startswith('/api/admin/metrics/'):
                period = parse_qs(parsed.query).get('period', [''])[0]
                calls.append((path, period))
                if settings['unauthorized']:
                    route.fulfill(status=401, json={'error': 'Unauthorized fixture'})
                elif settings['fail_stats']:
                    route.fulfill(status=500, json={'error': 'Failure fixture'})
                elif path.endswith('/stats'):
                    route.fulfill(json={'totalConversions': 42, 'successfulConversions': 40,
                                        'failedConversions': 2, 'totalPageViews': 50,
                                        'uniqueVisitors': 25, 'formatBreakdown': {'docx': 1, 'pdf': 2, 'gdocs': 3}})
                elif path.endswith('/conversions'):
                    route.fulfill(json={'conversions': []})
                else:
                    route.fulfill(json={'pageViews': []})
            elif path.startswith('/api/'):
                # No request may fall through to a real backend.
                route.abort()
            else:
                route.continue_()

        context.route('**/*', route_request)
        page = context.new_page()
        yield page, context, settings, calls
        context.close()
        browser.close()


def restore_state(page, *, expired=False):
    page.add_init_script('''sessionStorage.setItem('mdconverter_oauth_state', JSON.stringify({
      fileName:'restored.md', fileType:'text/markdown', fileContent:'data:text/markdown;base64,IyBGaXh0dXJl',
      selectedFormats:['pdf'], timestamp: Date.now() - %d}));''' % (360000 if expired else 0))


def test_oauth_restore_and_keyboard_conversion_use_current_state(ui):
    page, _, _, calls = ui
    restore_state(page)
    page.goto(URL)
    expect(page.get_by_text('restored.md', exact=True)).to_be_visible()
    expect(page.get_by_role('button', name='PDF format', exact=True)).to_have_attribute('aria-pressed', 'true')
    assert page.evaluate("sessionStorage.getItem('mdconverter_oauth_state')") is None
    page.keyboard.press('Enter')
    expect(page.get_by_text('Conversion Complete!', exact=True)).to_be_visible()
    assert len([call for call in calls if call[0] == 'convert']) == 1
    assert 'restored.md' in calls[0][1] and 'pdf' in calls[0][1]
    page.keyboard.press('Escape')
    expect(page.get_by_text('Drop your file here', exact=True)).to_be_visible()
    expect(page.get_by_role('button', name='PDF format', exact=True)).to_have_attribute('aria-pressed', 'false')


def test_expired_oauth_state_and_file_drop_validation(ui):
    page, _, _, calls = ui
    restore_state(page, expired=True)
    page.goto(URL)
    expect(page.get_by_text('Drop your file here', exact=True)).to_be_visible()
    # Wait for auth status so restoration/expiry processing has completed.
    expect(page.get_by_role('button', name='Google Docs format', exact=True)).to_be_visible()
    assert page.evaluate("sessionStorage.getItem('mdconverter_oauth_state')") is None
    target = page.get_by_role('button', name='Upload markdown or HTML file - click or drag and drop')
    target.evaluate("el => { const d=new DataTransfer();d.items.add(new File(['bad'],'blocked.exe'));el.dispatchEvent(new DragEvent('drop',{bubbles:true,dataTransfer:d})); }")
    expect(page.get_by_text('Invalid file type.', exact=False)).to_be_visible()
    target.evaluate("el => { const d=new DataTransfer();d.items.add(new File(['# Valid'],'dropped.md',{type:'text/markdown'}));el.dispatchEvent(new DragEvent('drop',{bubbles:true,dataTransfer:d})); }")
    expect(page.get_by_text('dropped.md', exact=True)).to_be_visible()
    page.get_by_role('button', name='PDF format', exact=True).click()
    page.keyboard.press('Enter')
    expect(page.get_by_text('Conversion Complete!', exact=True)).to_be_visible()
    assert len([call for call in calls if call[0] == 'convert']) == 1


def test_oauth_redirect_saves_file_and_uses_backend_navigation(ui):
    page, _, settings, _ = ui
    settings['authenticated'] = False
    page.goto(URL)
    target = page.get_by_role('button', name='Upload markdown or HTML file - click or drag and drop')
    target.evaluate("el => { const d=new DataTransfer();d.items.add(new File(['# OAuth fixture'],'oauth.md',{type:'text/markdown'}));el.dispatchEvent(new DragEvent('drop',{bubbles:true,dataTransfer:d})); }")
    # Fulfill the navigation locally; no Google login endpoint is contacted.
    page.route('**/login/google', lambda route: route.fulfill(content_type='text/html', body='<h1>OAuth fixture destination</h1>'))
    page.get_by_role('button', name='Google Docs format (click to sign in)', exact=True).click()
    expect(page).to_have_url(URL + '/login/google')
    saved = page.evaluate("JSON.parse(sessionStorage.getItem('mdconverter_oauth_state'))")
    assert saved['fileName'] == 'oauth.md' and saved['fileContent'].startswith('data:')


def admin_cookie():
    def encoded(data):
        return base64.urlsafe_b64encode(json.dumps(data).encode()).rstrip(b'=')
    message = encoded({'alg': 'HS256'}) + b'.' + encoded({'exp': int(time.time()) + 300})
    signature = base64.urlsafe_b64encode(hmac.new(b'fixture-only-admin-secret', message, hashlib.sha256).digest()).rstrip(b'=')
    return (message + b'.' + signature).decode()


def test_dashboard_initial_load_filter_refresh_error_recovery_and_unauthorized(ui):
    page, context, settings, calls = ui
    context.add_cookies([{'name': 'admin_token', 'value': admin_cookie(), 'url': URL}])
    page.goto(URL + '/admin/dashboard')
    expect(page.get_by_role('heading', name='Admin Dashboard')).to_be_visible()
    assert len(calls) == 3 and all(period == '7d' for _, period in calls)
    page.get_by_role('button', name='Today', exact=True).click()
    expect(page.get_by_role('button', name='Refresh', exact=True)).to_be_visible()
    assert len(calls) == 6 and all(period == '1d' for _, period in calls[3:])
    settings['fail_stats'] = True
    page.get_by_role('button', name='Refresh', exact=True).click()
    expect(page.get_by_text('Failed to load dashboard data', exact=True)).to_be_visible()
    settings['fail_stats'] = False
    page.get_by_role('button', name='Refresh', exact=True).click()
    expect(page.get_by_text('Failed to load dashboard data', exact=True)).to_have_count(0)
    expect(page.get_by_role('button', name='Refresh', exact=True)).to_be_visible()
    assert len(calls) == 12
    settings['unauthorized'] = True
    page.get_by_role('button', name='Refresh', exact=True).click()
    expect(page).to_have_url(URL + '/admin/login')
    page.get_by_role('link', name='← Back to Converter').click()
    expect(page).to_have_url(URL + '/')
