CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_threads_title_trgm
    ON threads USING gin (lower(title) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_threads_body_trgm
    ON threads USING gin (lower(body) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_entries_body_trgm
    ON entries USING gin (lower(body) gin_trgm_ops);
