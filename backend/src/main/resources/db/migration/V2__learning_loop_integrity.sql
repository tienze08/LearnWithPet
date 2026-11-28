-- This migration is intentionally safe for the already-deployed TiDB schema.
-- VocaPet production was baselined at version 1; future structural changes
-- belong in a new versioned migration rather than Hibernate ddl-auto.

CREATE INDEX IF NOT EXISTS idx_uvp_user_due
    ON user_vocabulary_progress (user_id, next_review_time);

CREATE INDEX IF NOT EXISTS idx_study_reviews_user_reviewed
    ON study_reviews (user_id, reviewed_at);

CREATE INDEX IF NOT EXISTS idx_study_sessions_user_started
    ON study_sessions (user_id, started_at);
