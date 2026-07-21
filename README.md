# Referral Operations

A governed referral lead-to-conversion application. The supported workflow is:

1. A lead is captured locally or received from a signed CRM webhook and deduplicated by normalized email inside its organization.
2. CRM, enrichment, consent, and suppression updates are replay-safe, timestamped, and stale/conflicting events are quarantined.
3. Ownership requires request, independent manager approval, and target-owner acceptance. Lifecycle changes are version checked and written to an immutable audit chain.
4. Outreach requires verified consent, a classified privacy region, no suppression, a separate human reviewer, daily limits, an active email provider, and an organizational postal address. Calendar work is queued when requested.
5. A durable outbox sends idempotent provider operations with bounded response size, timeout, no redirects, public-host validation, exponential retry, dead-letter state, and manual retry.
6. Delivery/bounce/complaint/opt-out webhooks update the journey; negative events suppress future queued sends. Conversion and data-quality metrics are calculated from persistent workflow records.

No AI or generated feature simulator is part of the runtime. Provider connectors use a documented JSON contract at `POST /v1/operations`; production enablement still requires provider-specific contracts/certification and operator-supplied credentials.

## Install and initialize

Requirements: Node.js 20+, PostgreSQL 14+, and provider endpoints using HTTPS.

```sh
npm ci --prefix server
npm ci --prefix client
npm run build --prefix client
cp .env.example .env
npm run migrate --prefix server
npm run create-admin --prefix server
./start.sh
```

`migrate` is an explicit deployment step. Routine startup never installs packages, migrates, seeds, creates a database, kills processes, or prints secrets. `create-admin` requires a 16+ character password and should be run once with its bootstrap variables removed immediately afterward.

Run `npm run worker --prefix server` as a separately supervised process using the same release, database, and provider-secret environment. The web UI also exposes an authenticated manual “run due work” control for recovery; it is not a replacement for the worker. The container defaults to the web process and can run the worker from the same image by overriding its command with `node server/worker.js`.

Provider records and team users are created by an authenticated administrator in the UI or through `/api/workflow/providers` and `/api/workflow/users`. Store only environment variable names (`CRM_TOKEN`, for example) in provider records. A connection cannot be activated unless its named token and webhook secret exist in the server environment. Managers/admins may record evidenced consent or suppression locally; those changes enqueue `CONSENT_EXPORT` and `SUPPRESSION_EXPORT` operations so connected systems remain synchronized.

Webhook signature: HMAC-SHA256 over the exact request body in `X-Workflow-Signature: sha256=<hex>`. Envelopes require `id`, `type`, `sourceOccurredAt`, and `data`. Supported types are `lead.upsert`, `enrichment.updated`, `consent.updated`, `suppression.created`, and `email.delivery`; each is accepted only from its matching provider type.

## Validation

```sh
TEST_DATABASE_URL=postgresql://.../referral_test npm test --prefix server
npm run build --prefix client
npm audit --prefix server --audit-level=high
npm audit --prefix client --audit-level=high
```

Tests require an explicitly supplied disposable database and cover fresh/replayed migrations, lifecycle rules, signatures and URL/SSRF controls, webhook replay/conflict handling, stale-event quarantine, consent, three-party ownership, reviewer separation, email/calendar outbox delivery, conversion metrics, immutable-chain verification, suppression cancellation, optimistic concurrency, and retry exhaustion.

See [SECURITY.md](SECURITY.md) for operational boundaries, credential rotation, backups, and incident handling.
