BEGIN;

ALTER TABLE categories ADD COLUMN IF NOT EXISTS owner_username varchar(80);
ALTER TABLE threads ADD COLUMN IF NOT EXISTS owner_username varchar(80);

UPDATE categories SET owner_username = 'user' WHERE owner_username IS NULL;
UPDATE threads SET owner_username = 'user' WHERE owner_username IS NULL;

DO $$
DECLARE constraint_name text;
BEGIN
  SELECT c.conname INTO constraint_name
  FROM pg_constraint c
  JOIN pg_class t ON c.conrelid = t.oid
  JOIN pg_namespace n ON n.oid = t.relnamespace
  WHERE t.relname = 'categories'
    AND c.contype = 'u'
    AND EXISTS (
      SELECT 1
      FROM unnest(c.conkey) WITH ORDINALITY AS k(attnum, ord)
      JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = k.attnum
      GROUP BY c.conname
      HAVING array_agg(a.attname ORDER BY k.ord)::text[] = ARRAY['name']::text[]
    );
  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE categories DROP CONSTRAINT %I', constraint_name);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'categories'
      AND c.contype = 'u'
      AND c.conname = 'categories_owner_name_unique'
  ) THEN
    ALTER TABLE categories
      ADD CONSTRAINT categories_owner_name_unique UNIQUE (owner_username, name);
  END IF;
END $$;

ALTER TABLE categories ALTER COLUMN owner_username SET NOT NULL;
ALTER TABLE threads ALTER COLUMN owner_username SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_threads_owner_username ON threads(owner_username);

COMMIT;
