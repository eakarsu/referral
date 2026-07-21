CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  name text NOT NULL,
  email text NOT NULL,
  password_hash text NOT NULL,
  role text NOT NULL CHECK (role IN ('ADMIN','MANAGER','AGENT')),
  active boolean NOT NULL DEFAULT true,
  auth_version integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, email)
);
CREATE UNIQUE INDEX users_email_login_key ON users (lower(email));

CREATE TABLE accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  name text NOT NULL,
  normalized_name text NOT NULL,
  lifecycle text NOT NULL DEFAULT 'PROSPECT' CHECK (lifecycle IN ('PROSPECT','ACTIVE','CUSTOMER','CLOSED')),
  owner_user_id uuid REFERENCES users(id),
  privacy_region text NOT NULL CHECK (privacy_region IN ('US_CAN_SPAM','EU_GDPR','CA_CCPA')),
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, normalized_name)
);

CREATE TABLE leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  account_id uuid REFERENCES accounts(id),
  owner_user_id uuid REFERENCES users(id),
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL,
  normalized_email text NOT NULL,
  phone text,
  lifecycle text NOT NULL DEFAULT 'NEW' CHECK (lifecycle IN ('NEW','ASSIGNED','QUALIFIED','OUTREACH_READY','ENGAGED','CONVERTED','DISQUALIFIED')),
  privacy_region text NOT NULL CHECK (privacy_region IN ('US_CAN_SPAM','EU_GDPR','CA_CCPA')),
  consent_status text NOT NULL DEFAULT 'PENDING' CHECK (consent_status IN ('PENDING','GRANTED','REVOKED')),
  external_crm_id text,
  attribution jsonb NOT NULL DEFAULT '{}'::jsonb,
  version integer NOT NULL DEFAULT 1,
  source_updated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, normalized_email)
);
CREATE INDEX leads_lifecycle_owner_idx ON leads (organization_id, lifecycle, owner_user_id);

CREATE TABLE provider_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('CRM','EMAIL','CALENDAR','ENRICHMENT','CONSENT','SUPPRESSION')),
  base_url text NOT NULL,
  token_env text NOT NULL,
  webhook_secret_env text NOT NULL,
  contract_ref text NOT NULL,
  active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, name),
  UNIQUE (organization_id, type, name)
);

CREATE TABLE sync_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  provider_connection_id uuid NOT NULL REFERENCES provider_connections(id),
  external_event_id text NOT NULL,
  event_type text NOT NULL,
  direction text NOT NULL CHECK (direction IN ('INBOUND','OUTBOUND')),
  payload_hash text NOT NULL,
  payload jsonb NOT NULL,
  source_occurred_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'PROCESSING' CHECK (status IN ('PROCESSING','APPLIED','QUARANTINED')),
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  UNIQUE (provider_connection_id, external_event_id)
);
CREATE INDEX sync_events_status_idx ON sync_events (organization_id, status, created_at);

CREATE TABLE consent_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  channel text NOT NULL DEFAULT 'EMAIL' CHECK (channel = 'EMAIL'),
  status text NOT NULL CHECK (status IN ('GRANTED','REVOKED')),
  source text NOT NULL,
  purpose text NOT NULL,
  evidence jsonb NOT NULL,
  captured_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX consent_records_lead_time_idx ON consent_records (lead_id, captured_at DESC);

CREATE TABLE suppressions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  normalized_email text NOT NULL,
  reason text NOT NULL,
  source text NOT NULL,
  occurred_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, normalized_email)
);

CREATE TABLE lifecycle_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  from_lifecycle text NOT NULL,
  to_lifecycle text NOT NULL,
  actor_user_id uuid NOT NULL REFERENCES users(id),
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE handoffs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  from_user_id uuid REFERENCES users(id),
  to_user_id uuid NOT NULL REFERENCES users(id),
  requested_by_id uuid NOT NULL REFERENCES users(id),
  approved_by_id uuid REFERENCES users(id),
  accepted_by_id uuid REFERENCES users(id),
  status text NOT NULL DEFAULT 'REQUESTED' CHECK (status IN ('REQUESTED','APPROVED','ACCEPTED','REJECTED','RETRY_REQUIRED')),
  reason text NOT NULL,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX handoffs_queue_idx ON handoffs (organization_id, status, created_at);
CREATE UNIQUE INDEX handoffs_one_active_idx ON handoffs (lead_id) WHERE status IN ('REQUESTED','APPROVED','RETRY_REQUIRED');

CREATE TABLE outreach_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  requester_user_id uuid NOT NULL REFERENCES users(id),
  reviewer_user_id uuid REFERENCES users(id),
  subject text NOT NULL,
  body text NOT NULL,
  calendar_at timestamptz,
  status text NOT NULL DEFAULT 'PENDING_REVIEW' CHECK (status IN ('PENDING_REVIEW','APPROVED','REJECTED','CANCELLED')),
  review_reason text,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX outreach_review_idx ON outreach_drafts (organization_id, status, created_at);

CREATE TABLE outreach_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  outreach_draft_id uuid NOT NULL REFERENCES outreach_drafts(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  idempotency_key text NOT NULL UNIQUE,
  provider_message_id text,
  status text NOT NULL DEFAULT 'QUEUED' CHECK (status IN ('QUEUED','SENT','DELIVERED','BOUNCED','COMPLAINED','OPTED_OUT','FAILED')),
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  sent_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX delivery_status_idx ON outreach_deliveries (organization_id, status, created_at);

CREATE TABLE outbox_operations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  provider_connection_id uuid NOT NULL REFERENCES provider_connections(id),
  lead_id uuid REFERENCES leads(id) ON DELETE SET NULL,
  kind text NOT NULL CHECK (kind IN ('CRM_UPSERT','EMAIL_SEND','CALENDAR_CREATE','ENRICHMENT_REQUEST','CONSENT_EXPORT','SUPPRESSION_EXPORT')),
  payload jsonb NOT NULL,
  idempotency_key text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','PROCESSING','RETRY','SUCCEEDED','DEAD_LETTER','CANCELLED')),
  attempts integer NOT NULL DEFAULT 0,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  last_error text,
  external_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX outbox_due_idx ON outbox_operations (status, next_attempt_at);

CREATE TABLE audit_events (
  sequence bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  action text NOT NULL,
  actor_user_id uuid REFERENCES users(id),
  detail jsonb NOT NULL,
  previous_hash text NOT NULL,
  hash text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_entity_idx ON audit_events (organization_id, entity_type, entity_id, sequence);

CREATE FUNCTION reject_audit_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'audit_events are immutable'; END $$;
CREATE TRIGGER audit_events_immutable BEFORE UPDATE OR DELETE ON audit_events
FOR EACH ROW EXECUTE FUNCTION reject_audit_mutation();
