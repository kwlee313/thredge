-- Create users table if missing
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY,
  username varchar(80) NOT NULL,
  password_hash varchar(200) NOT NULL,
  role varchar(20) NOT NULL DEFAULT 'USER',
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);

-- Ensure role column exists and is consistent
ALTER TABLE users ADD COLUMN IF NOT EXISTS role varchar(20);
UPDATE users SET role = 'USER' WHERE role IS NULL;
ALTER TABLE users ALTER COLUMN role SET NOT NULL;
ALTER TABLE users ALTER COLUMN role SET DEFAULT 'USER';

-- Unique username index
CREATE UNIQUE INDEX IF NOT EXISTS users_username_uq ON users (username);

-- App settings for signup policy
CREATE TABLE IF NOT EXISTS app_settings (
  key varchar(100) PRIMARY KEY,
  value varchar(200) NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
