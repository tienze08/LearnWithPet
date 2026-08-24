ALTER TABLE study_sessions
    ADD COLUMN IF NOT EXISTS last_active_at DATETIME NULL,
    ADD COLUMN IF NOT EXISTS current_vocabulary_id BIGINT NULL;

CREATE INDEX IF NOT EXISTS idx_study_sessions_active
    ON study_sessions (user_id, finished_at, last_active_at);
