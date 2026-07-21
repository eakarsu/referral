# Completeness Review: referral

**Review date:** 2026-07-18

## Assessment basis

Static inspection of project-owned source and configuration only; no dependency installation, build, database migration, external-service call, or runtime launch was performed. The scan considered 61 project files (51 source files), 2 manifest(s), 0 test-like file(s), and 0 CI workflow(s), excluding dependency/generated directories.

## Classification

**Prototype-demo**

This is a prototype/demo for sales/customer operations. Generated gap/demo patterns are present: it contains 51 source files and visible routes/pages in `client/`, `server/`, but those surfaces are not evidence of durable domain execution, verified integrations, or operational completion.

## Why it is not complete

- Generated gap/visualization routes describe missing capabilities or simulate recommendations; they do not implement the underlying domain operation.
- Generic LLM calls are used as product behavior without enough typed tools, grounded evidence, deterministic rules, or output evaluation.
- Mock, demo, sample, fixture, or placeholder behavior remains in executable/product paths.
- No recognizable project-owned automated tests were found for the main workflow.
- No checked-in CI workflow proves builds, tests, migrations, and security checks on every change.

## Needed features

1. Integrate CRM, email/calendar, enrichment, consent, and suppression sources with bidirectional, deduplicated sync.
2. Implement explicit lead/account lifecycle, ownership, approvals, attribution, and handoff/retry states.
3. Add deliverability, opt-out, regional privacy, rate-limit, and human-review controls for automated outreach.
4. Measure conversion and data quality with representative end-to-end workflow tests rather than generated sample records.
5. Add risk-based unit, integration, and end-to-end tests in CI, including migration and failure-path coverage.

## Risks or launch blockers

- Credential/configuration exposure: environment files are present in the repository tree and must be checked against Git history and rotated if real.
- Automation contains destructive process, filesystem, or database operations; do not run it on a shared machine without review.
- Startup appears coupled to seed/migration behavior, risking data mutation or non-repeatable launches.
- AI-provider availability, cost, privacy, prompt injection, and unvalidated output are launch risks until bounded and evaluated.

## Evidence inspected

- `client/src/App.jsx:22`
- `client/src/components/GapFeaturePage.jsx:54`
- `server/db.js`
- `server/index.js`
- `client/package.json`
- `start.sh`

## Recommended next action

Stop adding generated pages; prove one sales/customer operations workflow against real services and persistent state, with tests and measurable acceptance criteria.

## Implementation progress (2026-07-20)

The supported product is now one bounded, multi-user referral journey: attributed lead capture or signed CRM intake, consented ownership handoff, human-reviewed email/calendar outreach, provider delivery, engagement, and conversion. Generated gap pages, generic LLM behavior, sample records, destructive seeding, and the old unscoped CRUD runtime were removed.

1. **CRM, email/calendar, enrichment, consent, and suppression integration — implemented with an external activation gate.** `provider_connections` stores only HTTPS origins, environment-variable references, and contract references. Signed raw-body webhooks enforce provider/event-type matching, replay identity, content hashes, normalized-email deduplication, source timestamps, stale-event quarantine, enrichment provenance, consent history, and suppression cancellation. Local create, ownership, and lifecycle operations create idempotent outbound CRM work; approved outreach creates email and optional calendar work. The durable worker applies DNS/private-address checks, redirect refusal, a five-second timeout, a 64 KiB response cap, idempotency keys, exponential retry, dead-letter state, and admin-only retry. Real provider accounts, credentials, DPAs, webhook registration, and sandbox/production certification remain deployment gates—not simulated success.
2. **Lifecycle, ownership, approval, attribution, handoff, and retry — implemented.** Organization-scoped accounts and leads have explicit terminal state machines and optimistic versions. Accounts acquire an accountable owner and progress from prospect to active/customer with the lead. Lead attribution records source/campaign/first-touch identity. Ownership requires requester, different manager/admin approver, and target-owner acceptance. CRM handoff failures become `RETRY_REQUIRED`; provider operations expose pending/processing/retry/dead-letter/cancelled/succeeded states. Agent reads and mutations are owner scoped.
3. **Outreach controls — implemented.** Approval requires current recorded consent, a supported regional privacy classification, a valid normalized email, no suppression, a different human reviewer, an active provider, an organizational postal address, and recipient/owner daily limits. Approved content receives postal identity and an unsubscribe URL. Bounce, complaint, opt-out, consent-revocation, and suppression events prevent queued/future outreach. Delivery state is persisted and visible in the journey.
4. **Conversion and data quality — implemented.** The operations UI and metrics API report lifecycle counts, conversion rate, delivery states, missing owner/consent, suppressions, and quarantined sync. A representative PostgreSQL E2E test proves signed CRM intake, replay and conflict behavior, stale quarantine, consent gating, three-party ownership, optimistic conflict rejection, reviewer separation, rate limiting, email/calendar/CRM dispatch, delivery receipt, engagement, conversion, journey evidence, and audit verification without generated fixture records.
5. **Risk-based tests and CI — implemented.** Unit tests cover lifecycle, HMAC, provider URL/SSRF, deterministic hashing, and destructive/generated-runtime regression. Integration/E2E tests cover fresh migration and replay, modified-migration failure, database constraints, sync and review failures, outbox success, bounded retry exhaustion, suppression cancellation, and conversion. CI provisions PostgreSQL, installs from locks, runs tests/build/audits, builds the container, and scans secrets.

Operational hardening includes an explicit hash-checked migration runner with an advisory lock, a non-destructive single-server startup, exact-origin CORS, Helmet, rate-limited login/webhooks, eight-hour issuer/audience-bound JWTs revalidated against current role/active/auth-version state, an environment-only admin bootstrap, hash-chained trigger-protected audit events, a non-root multi-stage image, and guarded backup/restore scripts.

Verification completed on 2026-07-20:

- PostgreSQL 14 fresh migration and replay: passed; deliberately modified migration checksum failed closed.
- Automated tests: 6/6 passed, including the persistent end-to-end journey and retry/suppression failure path.
- Client production build: passed (34 modules transformed).
- Server and client clean installs/audits: passed; zero known vulnerabilities.
- Isolated startup, readiness, static client, login, and authenticated identity checks: passed; the process and PostgreSQL cluster were stopped cleanly.
- Custom-format backup and restore into an empty guarded `_restore` database: passed; restored operator count matched.
- Working-tree and Git-history gitleaks scans: passed with no leaks.
- Dockerfile lint: passed. Local image execution is not claimed because the Docker daemon was unavailable; CI owns the real image-build gate.
- Browser acceptance: **BLOCKED_BROWSER** because the in-app runtime reported no available browser instance. HTTP startup, static client, login, identity, and the full API workflow passed; no visual/accessibility click pass is claimed.

Remaining release gates are external: configure real provider sandboxes, execute their contract/certification suites, obtain privacy/legal approval for purposes/retention and regional policy, configure email-domain authentication and production rate limits, export audit events to an append-only control plane, run disaster-recovery drills, and complete accessibility/visual acceptance in the target browser. Until those gates are signed off, connections should remain inactive.

### Runtime campaign acceptance (2026-07-20)

The root launcher now resolves the original project from an isolated fixture and refuses a missing/default server port, while preserving loopback-only binding, immutable startup, and the built client served by the owned backend. The existing bcrypt-12 `create-admin` command now requires the standard explicit acknowledgement and accepts the validator's tenant/company name aliases; it retains transactionality and refuses collisions through database constraints. On fresh ports 55685/6172/6173, migration/bootstrap, startup, credentials login, database-revalidated bearer session, and authenticated `/api/auth/me` passed (`API_VERIFIED`, `startup_login_session_api`). A separate PostgreSQL run on 55686 passed all six tests—including the signed multi-provider journey and retry/suppression failure path—plus the 34-module Vite build, launcher/script checks, and `git diff --check`.
