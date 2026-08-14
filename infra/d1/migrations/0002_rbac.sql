-- users: OAuth-provisioned accounts
CREATE TABLE IF NOT EXISTS users (
  id              TEXT PRIMARY KEY,
  email           TEXT NOT NULL UNIQUE,
  display_name    TEXT NOT NULL,
  oauth_provider  TEXT NOT NULL,
  oauth_subject   TEXT NOT NULL,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  last_login_at   TEXT NOT NULL DEFAULT (datetime('now')),
  active          INTEGER NOT NULL DEFAULT 1
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_oauth ON users(oauth_provider, oauth_subject);

-- roles: fixed set seeded at migration time
CREATE TABLE IF NOT EXISTS roles (
  id    TEXT PRIMARY KEY,
  name  TEXT NOT NULL UNIQUE
);

INSERT OR IGNORE INTO roles VALUES ('role_admin',   'ADMIN');
INSERT OR IGNORE INTO roles VALUES ('role_analyst', 'ANALYST');
INSERT OR IGNORE INTO roles VALUES ('role_viewer',  'VIEWER');

-- user_roles: many-to-many assignment
CREATE TABLE IF NOT EXISTS user_roles (
  user_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id  TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, role_id)
);
