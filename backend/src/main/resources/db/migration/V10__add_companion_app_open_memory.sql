ALTER TABLE companion_memories
    ADD COLUMN IF NOT EXISTS last_app_opened_at DATETIME NULL;
