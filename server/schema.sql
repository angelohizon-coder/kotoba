-- Future PostgreSQL migration. Not executed, and no database connection is configured.
-- Stable existing curriculum IDs remain text; subjects and mutations use UUIDv4.
BEGIN;
CREATE TABLE learner_progress (
  subject_id uuid PRIMARY KEY,
  revision bigint NOT NULL DEFAULT 0 CHECK (revision BETWEEN 0 AND 9007199254740991),
  schema_version integer NOT NULL,
  content_version text NOT NULL,
  progress jsonb NOT NULL CHECK (jsonb_typeof(progress) = 'object'),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE progress_mutations (
  subject_id uuid NOT NULL REFERENCES learner_progress(subject_id) ON DELETE CASCADE,
  mutation_id uuid NOT NULL,
  request_digest text NOT NULL,
  resulting_revision bigint NOT NULL,
  recorded_result jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (subject_id, mutation_id)
);
CREATE TABLE curriculum_items (
  content_id text PRIMARY KEY,
  kind text NOT NULL CHECK (kind IN ('vocabulary','kanji','grammar','reading','listening','question','lesson')),
  jlpt_level text NOT NULL CHECK (jlpt_level IN ('n5','n4','n3','n2','n1')),
  payload jsonb NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  author_id uuid,
  modified_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE learner_srs (
  subject_id uuid NOT NULL REFERENCES learner_progress(subject_id) ON DELETE CASCADE,
  content_id text NOT NULL REFERENCES curriculum_items(content_id),
  easiness_factor numeric NOT NULL DEFAULT 2.5 CHECK (easiness_factor >= 1.3),
  interval_days integer NOT NULL DEFAULT 0 CHECK (interval_days >= 0),
  repetitions integer NOT NULL DEFAULT 0 CHECK (repetitions >= 0),
  next_review_at timestamptz NOT NULL,
  PRIMARY KEY (subject_id, content_id)
);
CREATE INDEX learner_srs_due ON learner_srs(subject_id, next_review_at);
CREATE TABLE learning_activity (
  subject_id uuid NOT NULL REFERENCES learner_progress(subject_id) ON DELETE CASCADE,
  event_id uuid NOT NULL,
  kind text NOT NULL,
  payload jsonb NOT NULL,
  occurred_at timestamptz NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (subject_id, event_id)
);
COMMIT;
-- The future adapter must atomically replay a matching receipt OR compare revision,
-- UPDATE the snapshot and INSERT the receipt in one transaction. Never merge by
-- client timestamp or overwrite conflicting offline work. See docs/backend-contract.md.
