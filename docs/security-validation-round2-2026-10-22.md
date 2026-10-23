# Converter round 2 validation — 2026-10-22

Prepared local work only. No push, PR, deployment, migration, live OAuth, external
send, production variable/credential access, host-root or shared-runtime change.
Original commit c60159ed468e35eb4c17e61ee56f4c0482867686 is preserved. Frontend lint
compatibility is isolated in b538647cb0b9867d1591ee1a679cf2e977a6c5ff, with four
passing browser tests and [a finding-by-finding review](lint-compatibility-2026-10-22.md).

## Actual final images

Both images were built under `flock /tmp/synaptic-cve-remediation-heavy.lock`
with the legacy Docker builder's effective `--memory=2048m --cpu-quota=200000`
limits. No shared Docker builder or host runtime configuration was changed.
Frontend builds set a 1536 MiB Node heap and two page-generation workers.
A new `.dockerignore` excludes host dependencies/build output/environment files.

- Backend tag `doc-converter-backend-security:20261022-r2`, local image ID
  `sha256:75b207d8da4a19e2fe4cea2cdf89d4277230a07e5b064a99c0f24ff7540dc59f`,
  Linux amd64, user `appuser`.
- Frontend tag `doc-converter-frontend-security:20261022-r2`, local image ID
  `sha256:b335fd3ada853d1c92fd359a22af0687a927c1109288cac23ab16a14378b9402`,
  Linux amd64, user `nextjs`.

Backend inspection: Python 3.12.15, OpenSSL 3.0.22, Playwright 1.64.1,
Chrome/Headless Shell 156.0.8078.4, WeasyPrint 70.0/Pydyf 0.13.0. All **72** runtime
packages match requirements.lock; pip check passes. The actual build installs
with `pip install --prefix=/install --require-hashes -r requirements.lock`.
Lock SHA256: `c3253042a76b2d89b4b0959f7fc4d1a5c45fc617d51e2dea6eac8260296dd098`.
Ghostscript is absent in this built image; production presence remains unobserved.
Pandoc on PATH is 2.17.1.1; pypandoc actually selects its bundled 2.19.2 binary.
This is not a complete OS/native-library/Pandoc/browser vulnerability audit.

Frontend inspection: Node 24.22.1, Next 16.4.1, React 19.2.3, Sharp 0.35.5
(native module loads successfully), libvips 8.18.7, Alpine 3.24.3. The actual Docker
build uses `pnpm install --frozen-lockfile`, then the production standalone build.
The initial invocation included an unused NODE_OPTIONS build argument; the actual
heap limit comes from the builder-stage ENV, and Docker's warning does not change
that setting. The reproduction command below omits the unused argument.

## Real browser and compatibility results

The final 17-test container run is queued on the shared heavy-work lock. Do not
represent it as passed yet. The previous actual-image run passed all 15 original
checks and the forced-error lifecycle test (16 passed), but its content test used
an overstrict total image-object count. The final test now asserts the supported
inline PNG's decoded pixels while retaining text/table/Unicode, script/file
sentinel, zero fixture-server-request and browser-process cleanup checks.
The current final command/result is tracked in the Nexus round 2 checkpoint and
`older-apps-r2-backend-container-tests.log`; owner rollout gates remain open.

The PDF error-injection test initially showed the real Browser object remained
connected after a PDF write failure. The converter now closes the browser in a
`finally` block, releasing its contexts on failure as well as success. This is a
separate backend behavior/resource-lifecycle correction, not a policy expansion.
The regression tests launch actual Chromium and inspect remaining Chromium process
IDs, in addition to checking browser disconnection. Only the PDF write failure is
injected; the browser/document rendering are real.

The first harness mount omitted pytest's py.py shim and failed before collection;
that was corrected without changing the production image's package installation.
PDF text checks normalize Unicode ligatures, and raster checks verify the supported
PNG's decoded pixels rather than counting Chromium's broken-resource placeholders.
The initial failing receipts are retained, not represented as successful tests.

Four real browser frontend tests passed (4 passed in 6.34s): OAuth state save,
restore/expiry, file-drop validation, Enter/Escape conversion, dashboard initial
load/filter/refresh, error recovery, unauthorized redirect and internal back-link
navigation. All application APIs were mocked. The frontend container had
`--network none`; the browser runner shared only that offline container namespace.
There were no live login, Google export, contact submission or client-site requests.

## Reproduce or inspect

Evidence directory on professor-synapse:
`/home/profsynapse/.t3/scratch/2026-10-22-there-s-recently-been-a-17c15cd7`.
It contains `older-apps-r2-commands.sh`, `older-apps-r2-run-backend-tests.sh`,
`older-apps-r2-run-frontend-tests.sh`, full Docker build/test logs, exact image
inspection JSON and `older-apps-r2-pdf-artifacts/chromium-policy.pdf`.
Test-only pytest 9.1.1/pypdf 6.21.2/pluggy 1.7.0/iniconfig 2.3.1 modules are mounted
read-only from the original isolated test environment (including pytest's py.py).
The production interpreter and 72 runtime packages come from the final image.
`older-apps-r2-testdeps-manifest.json` records the overlay; packaging/Pygments are
supplied by the runtime lock. A normal isolated requirements-test.txt installation
provides the same test prerequisites. Tests are opt-in when Chromium or the isolated
frontend image is required; the recorded container commands enable them explicitly.

```sh
# From backend/ and frontend/, respectively; serialize each command under the lock.
flock /tmp/synaptic-cve-remediation-heavy.lock env DOCKER_BUILDKIT=0 \
  docker build --pull --memory=2048m --cpu-quota=200000 \
  -t doc-converter-backend-security:20261022-r2 .
flock /tmp/synaptic-cve-remediation-heavy.lock env DOCKER_BUILDKIT=0 \
  docker build --pull --memory=2048m --cpu-quota=200000 \
  -t doc-converter-frontend-security:20261022-r2 .
# The evidence scripts contain the exact offline container mounts and fixture-only env.
flock /tmp/synaptic-cve-remediation-heavy.lock bash older-apps-r2-run-backend-tests.sh
flock /tmp/synaptic-cve-remediation-heavy.lock bash older-apps-r2-run-frontend-tests.sh
```

## Remaining owner gates and limits

Remote images/CSS/fonts are intentionally unavailable in PDF output. Owner review
of this change and representative styled customer documents remains required.
Markdown's WeasyPrint fetcher permits only verified inline raster resources;
Chromium's HTML path separately disables scripts/service workers and aborts
intercepted requests. HTML is not generally sanitized or restricted to the
WeasyPrint raster MIME whitelist; self-contained inline SVG/CSS may still render.
No asset policy was widened in this round. Offline test containers add an OS
network boundary for these tests; production is not thereby an OS-isolated worker.

Google image retrieval still follows redirects after a hostname/literal-IP check
without binding DNS results to the connected address. Pandoc DOCX can fetch network
or local assets. These paths require a separate limited conversion worker and
controlled asset ingestion before accepting hostile arbitrary documents. PDF-only
checks do not establish universal conversion isolation.

Live OAuth login/refresh, Google acceptance/private sharing, session/CORS behavior
and staging/customer document review need separate authorization and a test account.
BC Connect still requires Joseph's coordination with its client/site owner. Frontier
and BC code/checks were unchanged in this round. Deployments and verification of
actual deployed versions/image digests remain owner-authorized work. Keep the
existing Nexus remediation task in_progress.
