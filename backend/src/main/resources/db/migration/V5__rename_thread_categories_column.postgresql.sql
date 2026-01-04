DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'thread_categories'
          AND column_name = 'thread_entity_id'
    ) THEN
        ALTER TABLE thread_categories DROP CONSTRAINT IF EXISTS thread_categories_pkey;
        ALTER TABLE thread_categories DROP CONSTRAINT IF EXISTS fk7m22ssi7ldjxmhfnnbumv9mmk;
        ALTER TABLE thread_categories DROP CONSTRAINT IF EXISTS fke0xmptdrqh5jik77n9y9dti3h;
        ALTER TABLE thread_categories DROP CONSTRAINT IF EXISTS fk_thread_categories_thread_id;

        ALTER TABLE thread_categories RENAME COLUMN thread_entity_id TO thread_id;

        ALTER TABLE thread_categories
            ADD CONSTRAINT pk_thread_categories PRIMARY KEY (thread_id, categories_id);

        ALTER TABLE thread_categories
            ADD CONSTRAINT fk_thread_categories_thread_id
            FOREIGN KEY (thread_id) REFERENCES threads (id);
    END IF;
END $$;
