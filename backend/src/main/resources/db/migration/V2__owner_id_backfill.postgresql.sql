alter table threads add column if not exists owner_id uuid;
alter table categories add column if not exists owner_id uuid;

update threads t
set owner_id = u.id
from users u
where t.owner_id is null
  and t.owner_username = u.username;

update categories c
set owner_id = u.id
from users u
where c.owner_id is null
  and c.owner_username = u.username;

alter table threads alter column owner_id set not null;
alter table categories alter column owner_id set not null;

create index if not exists idx_threads_owner_hidden_pinned_activity
    on threads (owner_id, is_hidden, is_pinned, last_activity_at);
create index if not exists idx_threads_owner_created
    on threads (owner_id, created_at);
create index if not exists idx_entries_thread_created
    on entries (thread_id, created_at);
create index if not exists idx_entries_thread_hidden_created
    on entries (thread_id, is_hidden, created_at);
create index if not exists idx_entries_parent
    on entries (parent_entry_id);
create index if not exists idx_categories_owner
    on categories (owner_id);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_threads_owner_id') THEN
        ALTER TABLE threads
            ADD CONSTRAINT fk_threads_owner_id
            FOREIGN KEY (owner_id) REFERENCES users (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_categories_owner_id') THEN
        ALTER TABLE categories
            ADD CONSTRAINT fk_categories_owner_id
            FOREIGN KEY (owner_id) REFERENCES users (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uk_categories_owner_name') THEN
        ALTER TABLE categories
            ADD CONSTRAINT uk_categories_owner_name UNIQUE (owner_id, name);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'thread_categories'::regclass
          AND contype = 'p'
    ) THEN
        ALTER TABLE thread_categories
            ADD CONSTRAINT pk_thread_categories PRIMARY KEY (thread_id, categories_id);
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'thread_categories'
          AND column_name = 'thread_id'
    )
    AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_thread_categories_thread_id') THEN
        ALTER TABLE thread_categories
            ADD CONSTRAINT fk_thread_categories_thread_id
            FOREIGN KEY (thread_id) REFERENCES threads (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_thread_categories_category_id') THEN
        ALTER TABLE thread_categories
            ADD CONSTRAINT fk_thread_categories_category_id
            FOREIGN KEY (categories_id) REFERENCES categories (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_entries_thread_id') THEN
        ALTER TABLE entries
            ADD CONSTRAINT fk_entries_thread_id
            FOREIGN KEY (thread_id) REFERENCES threads (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_entries_parent_id') THEN
        ALTER TABLE entries
            ADD CONSTRAINT fk_entries_parent_id
            FOREIGN KEY (parent_entry_id) REFERENCES entries (id);
    END IF;
END $$;
