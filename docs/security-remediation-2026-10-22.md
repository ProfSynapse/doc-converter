# Security remediation preparation — 2026-10-22

Prepared locally; no deployment, migration, account change or credential operation.
Base: main at 45879ceb3d54997cb3580609cf1e20d5a1502d9f. Production backend was
recorded at 7c5efcd820e9ec99a87fd070bb87cd9a0b848f5c; its dependency manifests
match the audit, but this change must be built and tested for both environments.

## Changes

- Frontend Next and eslint-config-next 16.4.1, supported Node 24.22.1, Sharp 0.35.5
  through Next. Transitive Babel/Browserslist/source-map packages refreshed.
- Replace the npm lock with pnpm's imported/updated lock; packageManager pins
  pnpm 10.28.2. Docker uses the same frozen lock as local checks.
- Flask 3.1.3, Werkzeug 3.1.9, Flask-CORS 6.0.5, WeasyPrint 70.0 with Pydyf 0.13.0,
  Mistune 3.4.0, Pygments 2.21.0. Python-Markdown 3.11.2 and python-dotenv 1.2.4
  also address findings from the refreshed installed-environment audit.
- Declare the previously missing direct Bleach dependency at 6.4.0.
- Freeze backend transitive dependencies with hashes and install that lock in
  Docker. Pin the Python 3.12.15 Bookworm base by immutable registry digest.
- Markdown PDF resources use WeasyPrint 70's URLFetcher protocol, permitting only
  verified inline PNG/JPEG/GIF/WebP bytes. No network, local-file, CSS/SVG, EPS or
  disguised EPS resource can fall back to a default fetcher. Raster assets are
  capped at 10 MiB and 16 million pixels.
- HTML PDFs run Chromium with scripts disabled, service workers blocked, and
  all intercepted requests aborted. Build page generation uses at most two workers.

## Behavior and remaining boundaries

Remote images, stylesheets and fonts no longer load into PDFs. Inline CSS, text,
tables and supported inline raster images remain available. Hyperlinks in the
output are retained. This intentional compatibility change requires owner review.
Round 2 built both final Docker images and added real Chromium checks; see
[round 2 validation](security-validation-round2-2026-10-22.md) for exact outcomes.
The PDF policy is not an operating system egress sandbox or a complete limit on
CPU/memory use from hostile documents.

The EPS advisory concerns untrusted images reaching Pillow/Ghostscript. The old
Dockerfile did not explicitly install Ghostscript; production presence remains
unobserved. Ghostscript is absent from the inspected local round 2 image. No live exploit was
attempted. The patched WeasyPrint release and additional asset restrictions address
that route without assuming Ghostscript is absent.

Other conversion paths still require review: Google HTML export uses requests.get
with automatic redirects after a URL check that does not bind DNS to the connected
address. Pandoc DOCX conversion can fetch URL/local assets. PDF hardening does not
isolate those paths. Before accepting hostile arbitrary documents, introduce a
separate conversion worker without service credentials or private-network access,
strict resource/time limits, and controlled asset ingestion shared by all engines.
No claim of full SSRF or document-rendering clearance is made.

Mistune directive/math advisories require optional plugins; application code uses
Python-Markdown for PDFs and a custom Google request parser. No direct application
Mistune directive/math configuration or WeasyPrint presentational_hints=True was
found. Windows Werkzeug path advisories do not establish Linux exploitability.

## Reproduce validation

Use Node 24.22.1 and Python 3.12.15 in an isolated checkout. Do not replace the
shared host runtime. Serialize expensive commands with the team's flock lock.

```sh
cd frontend
pnpm install --frozen-lockfile --network-concurrency=2 --child-concurrency=1
pnpm exec tsc --noEmit
CIRCLE_NODE_TOTAL=3 NODE_OPTIONS=--max-old-space-size=2048 pnpm build
pnpm lint
pnpm audit --prod
cd ..
uv venv --python 3.12.15 .venv
uv pip sync --python .venv/bin/python backend/requirements.lock
uv pip install --python .venv/bin/python -r backend/requirements-test.txt
PYTHONPATH=backend .venv/bin/pytest -q backend/tests
uv pip check --python .venv/bin/python
```

The conversion tests render real PDF/DOCX fixtures, check inline assets/text/tables,
exercise the Flask factory with dummy config and an in-memory SQLite URL, and mock
Google Docs/Drive. No Google API calls, login, publication or live DB is involved.
The updated lint configuration now passes without warnings or suppressions;
[the compatibility review](lint-compatibility-2026-10-22.md) documents the focused
fixes and four passing browser tests. Original lint behavior was not reproduced,
so unchanged source is not evidence that the old dependency set reported the same findings.

## Owner rollout gates

1. Review the PDF asset behavior and Google/Pandoc risk before enabling untrusted
   workloads. The frontend lint gate is now resolved; policy/behavior approval remains.
2. Review the built-image and Chromium fixture receipts in the round 2 document.
   Compare representative styled customer PDFs for pagination, tables, fonts and
   Unicode. Final deployed images must be rebuilt/promoted and their runtime
   versions/digests verified after separate deployment authorization. The local
   images do not prove a deployed environment changed.
3. Exercise OAuth login/refresh and Google export with a test account in staging;
   review CORS origin configuration, session-cookie behavior and private sharing.
4. After separate owner authorization, deploy reviewed immutable artifacts to
   staging first, test conversions, then plan production with rollback to the
   previous image. Verify both backend and frontend in each environment. No live
   database migration is included in this change.

## Primary sources

- https://nextjs.org/blog/nextjs-security-update-october-14-2026
- https://nodejs.org/en/blog/vulnerability/october-2026-security-releases
- https://github.com/pallets/flask/security/advisories/GHSA-68rp-wp8r-4726
- https://github.com/pallets/werkzeug/security/advisories/GHSA-q34m-jh98-gwm2
- https://github.com/Kozea/WeasyPrint/security/advisories/GHSA-983w-rhvv-gwmv
- https://github.com/Kozea/WeasyPrint/security/advisories/GHSA-jf6q-chmf-3h3v
- https://github.com/Kozea/WeasyPrint/security/advisories/GHSA-r543-q48m-4c9j
- https://doc.courtbouillon.org/weasyprint/stable/api_reference.html
