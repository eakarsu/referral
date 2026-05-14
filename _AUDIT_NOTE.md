# Audit Note - referral

Source: `_AUDIT/reports/batch_11.md` (lines 602-654).

## Original Audit Recommendations

### Missing AI Counterparts
- `/contact-sync-assistant` for CRM/email import.
- `/network-health-analyzer` (relationship-health exists but could be more advanced).
- `/referral-source-attribution` for tracking ROI per source.

### Missing Non-AI Features
- CRM integration (Salesforce, HubSpot import).
- Email automation/sequences (nurturing exists but no execution visible).
- Payment/commission tracking.
- Mobile app.
- Calendar integrations (Outlook, Google Calendar).

### Custom Feature Suggestions
1. Agentic Follow-Up Orchestrator.
2. LinkedIn Network Sync & Enrichment.
3. Event-Driven Networking.
4. Referral Attribution & ROI Tracking.
5. White-Label Partner Portal.
6. Voice-to-Record.

## Implementations Applied

Added 3 AI endpoints to `server/routes/ai.js` matching the existing OpenRouter pattern + auth middleware:
- `POST /api/ai/contact-sync-assistant`
- `POST /api/ai/network-health-analyzer`
- `POST /api/ai/referral-source-attribution`

Each follows the same `callOpenRouter(messages, systemPrompt)` signature already in use. No new dependencies.

## Backlog (Prioritized)

### High
- Email automation execution (nurturing sequences) — needs SMTP/SendGrid decision.
- Calendar integration (Google/Outlook).
- Commission tracking on referrals.

### Medium
- CRM imports (Salesforce/HubSpot).
- LinkedIn enrichment.
- Mobile app.

### Low / Product Decisions
- White-label partner portal.
- Voice-to-record call logging.

## Apply pass 3 (frontend)

LEFT-AS-IS. Frontend already wires all backend AI endpoints (including the apply-pass-2 additions) with JWT Bearer auth from `localStorage`. No FE changes needed; idempotence rule applied. See `_AUDIT/apply3_logs/ab3_99.md`.
