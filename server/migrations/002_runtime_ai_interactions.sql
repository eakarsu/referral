CREATE TABLE runtime_ai_interactions (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  feature text NOT NULL,
  input jsonb NOT NULL,
  output jsonb NOT NULL,
  model text NOT NULL,
  provider_receipt jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX runtime_ai_interactions_user_idx ON runtime_ai_interactions (user_id, created_at DESC);
