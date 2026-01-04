ALTER TABLE entries
ADD COLUMN order_index BIGINT;

WITH ordered AS (
    SELECT
        id,
        (ROW_NUMBER() OVER (
            PARTITION BY thread_id, parent_entry_id
            ORDER BY created_at, id
        ) * 1000) AS order_index
    FROM entries
)
UPDATE entries e
SET order_index = ordered.order_index
FROM ordered
WHERE e.id = ordered.id;

ALTER TABLE entries
ALTER COLUMN order_index SET NOT NULL;

CREATE INDEX idx_entries_thread_parent_order
ON entries (thread_id, parent_entry_id, order_index);
