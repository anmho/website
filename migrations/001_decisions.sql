BEGIN;
CREATE TABLE IF NOT EXISTS private_decisions (
  owner text NOT NULL,
  id text NOT NULL,
  document jsonb NOT NULL,
  revision integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (owner, id)
);
CREATE TABLE IF NOT EXISTS private_decision_evaluations (
  id uuid PRIMARY KEY,
  owner text NOT NULL,
  decision_id text NOT NULL,
  input_hash text NOT NULL,
  snapshot jsonb NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'complete', 'failed')),
  result jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  UNIQUE (owner, decision_id, input_hash),
  FOREIGN KEY (owner, decision_id) REFERENCES private_decisions(owner, id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS private_decision_evaluations_owner_time
  ON private_decision_evaluations(owner, created_at DESC);
-- Kept independently of decision deletion so deleting a draft cannot reset billing limits.
CREATE TABLE IF NOT EXISTS private_decision_usage (
  owner text NOT NULL,
  day date NOT NULL,
  calls integer NOT NULL DEFAULT 0,
  PRIMARY KEY (owner, day)
);
COMMIT;
