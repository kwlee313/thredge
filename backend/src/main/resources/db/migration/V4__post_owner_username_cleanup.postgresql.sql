DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uk_categories_owner_username_name') THEN
        ALTER TABLE categories DROP CONSTRAINT uk_categories_owner_username_name;
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uk_categories_owner_name
    ON categories (owner_id, name);
