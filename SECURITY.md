# Security and operations

## Supported boundary

The application is multi-user and organization-scoped. Roles are `ADMIN`, `MANAGER`, and `AGENT`; agent lead access is ownership-scoped. JWTs expire after eight hours and are revalidated against active user and authentication-version state on every request. CORS uses an exact allowlist. Public routes are limited to liveness/readiness, login, static files, and signed provider webhooks.

Provider tokens and webhook secrets must live in a deployment secret store and are referenced by environment-variable name in the database. Rotate credentials if they ever appeared in a file, shell history, log, or Git history. The application never returns credential names to non-administrators or credential values to any caller.

Outbound connectors require a credential-free HTTPS origin, resolve only to public addresses, reject redirects, time out after five seconds, cap responses at 64 KiB, and send an idempotency key. DNS rebinding protection must also be enforced at the deployment network/egress layer; application checks are defense in depth, not a firewall.

## Privacy and outreach

Do not activate outreach until legal/privacy owners approve regional purpose, consent evidence, retention, suppression sources, unsubscribe handling, postal identity, daily limits, provider data-processing contracts, and email-domain authentication. This implementation conservatively requires recorded email consent in every supported region. Bounces, complaints, opt-outs, consent revocations, and suppression feeds cancel queued sends.

Human separation is mandatory: a requester cannot approve their own handoff or outreach. Manual dead-letter retry is admin-only. Audit records are hash chained and protected by a database trigger from update/delete; export them to append-only external storage for higher-assurance retention.

## Deployment and recovery

- Run migrations explicitly before replacing application instances. Migration hashes make modified applied migrations fail closed.
- Supervise one or more `worker` processes and alert if no cycles occur while due outbox work exists; database claims make concurrent workers safe.
- Run as an unprivileged OS/database user with only the required schema privileges.
- Restrict database and provider egress at the network layer; terminate TLS at a reviewed proxy.
- Back up with `ops/backup.sh`. Test restoration into an empty database whose name contains `_restore` or `_test` using `ops/restore.sh`.
- Monitor readiness, failed logins, webhook signature failures, quarantined sync events, retry/dead-letter counts, bounces/complaints, suppression growth, audit verification, and conversion/data-quality metrics.
- Incident response: disable affected connections, rotate provider/JWT credentials, increment user `auth_version` or deactivate accounts, preserve audit/provider logs, and reconcile quarantined events before reactivation.

Report suspected vulnerabilities privately to the repository owner. Do not include live personal data or credentials in a report.
