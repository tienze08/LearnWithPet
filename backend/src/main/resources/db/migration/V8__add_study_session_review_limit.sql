ALTER TABLE study_sessions
    ADD COLUMN IF NOT EXISTS review_limit INT NULL;
