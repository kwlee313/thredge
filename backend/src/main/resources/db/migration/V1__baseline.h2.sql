create table if not exists users (
    id uuid primary key,
    username varchar(80) not null,
    password_hash varchar(200) not null,
    created_at timestamp not null,
    updated_at timestamp not null,
    constraint uk_users_username unique (username)
);

create table if not exists threads (
    id uuid primary key,
    title varchar(200) not null,
    body text,
    owner_id uuid not null,
    is_hidden boolean not null,
    is_pinned boolean not null,
    created_at timestamp not null,
    updated_at timestamp not null,
    last_activity_at timestamp not null,
    constraint fk_threads_owner_id foreign key (owner_id) references users (id)
);

create table if not exists categories (
    id uuid primary key,
    name varchar(80) not null,
    owner_id uuid not null,
    thread_count bigint not null,
    constraint uk_categories_owner_name unique (owner_id, name),
    constraint fk_categories_owner_id foreign key (owner_id) references users (id)
);

create table if not exists entries (
    id uuid primary key,
    thread_id uuid not null,
    parent_entry_id uuid,
    body text not null,
    is_hidden boolean not null,
    created_at timestamp not null,
    updated_at timestamp not null,
    constraint fk_entries_thread_id foreign key (thread_id) references threads (id),
    constraint fk_entries_parent_id foreign key (parent_entry_id) references entries (id)
);

create table if not exists thread_categories (
    thread_id uuid not null,
    categories_id uuid not null,
    constraint pk_thread_categories primary key (thread_id, categories_id),
    constraint fk_thread_categories_thread_id foreign key (thread_id) references threads (id),
    constraint fk_thread_categories_category_id foreign key (categories_id) references categories (id)
);

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

create table if not exists spring_session (
    primary_id char(36) not null,
    session_id char(36) not null,
    creation_time bigint not null,
    last_access_time bigint not null,
    max_inactive_interval int not null,
    expiry_time bigint not null,
    principal_name varchar(100),
    constraint spring_session_pk primary key (primary_id),
    constraint spring_session_session_id_uk unique (session_id)
);

create index if not exists spring_session_principal_name_ix
    on spring_session (principal_name);

create table if not exists spring_session_attributes (
    session_primary_id char(36) not null,
    attribute_name varchar(200) not null,
    attribute_bytes longvarbinary not null,
    constraint spring_session_attributes_pk primary key (session_primary_id, attribute_name),
    constraint spring_session_attributes_fk foreign key (session_primary_id)
        references spring_session (primary_id) on delete cascade
);
