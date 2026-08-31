-- Esquema inicial del Portal de Operaciones.
-- Reemplaza las 4 hojas de Google Sheets (Usuarios, Fichas, NotifConfig,
-- MonitorServicios) por tablas relacionales con claves foráneas reales.

CREATE TABLE users (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  username              TEXT NOT NULL UNIQUE,
  password_hash         TEXT NOT NULL,
  password_algo         TEXT NOT NULL DEFAULT 'argon2id',
  legacy_password_hash  TEXT,                 -- SHA-256+salt de la migración desde Sheets
  legacy_password_salt  TEXT,
  role                  TEXT NOT NULL CHECK (role IN ('admin','usuario')),
  active                INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)),
  created_at            TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            TEXT
);

CREATE TABLE modules (
  id   INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE
);

CREATE TABLE user_modules (
  user_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  module_id INTEGER NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, module_id)
);
CREATE INDEX idx_user_modules_user ON user_modules(user_id);

CREATE TABLE sessions (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id             INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  refresh_token_hash  TEXT NOT NULL UNIQUE,
  user_agent          TEXT,
  ip                  TEXT,
  created_at          TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at          TEXT NOT NULL,
  revoked_at          TEXT
);
CREATE INDEX idx_sessions_user ON sessions(user_id);

CREATE TABLE fichas (
  id          TEXT PRIMARY KEY,               -- uuid v4, generado server-side
  tipo        TEXT NOT NULL CHECK (tipo IN ('canje','credito')),
  nombre      TEXT NOT NULL,
  data_json   TEXT NOT NULL,                  -- estado del formulario, igual forma que hoy
  created_by  INTEGER REFERENCES users(id) ON DELETE SET NULL,
  updated_by  INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_fichas_tipo ON fichas(tipo);
CREATE INDEX idx_fichas_updated_at ON fichas(updated_at);

CREATE TABLE ficha_images (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  ficha_id   TEXT NOT NULL REFERENCES fichas(id) ON DELETE CASCADE,
  kind       TEXT NOT NULL CHECK (kind IN ('hero','logo')),
  file_path  TEXT NOT NULL,                    -- ruta relativa dentro de UPLOADS_DIR
  hash       TEXT NOT NULL,                    -- evita resubir si la imagen no cambió
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (ficha_id, kind)
);
CREATE INDEX idx_ficha_images_hash ON ficha_images(hash);

CREATE TABLE pdf_shares (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  ficha_id    TEXT NOT NULL REFERENCES fichas(id) ON DELETE CASCADE,
  file_path   TEXT NOT NULL,
  token_hash  TEXT NOT NULL UNIQUE,
  created_by  INTEGER REFERENCES users(id) ON DELETE SET NULL,
  expires_at  TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_pdf_shares_token_hash ON pdf_shares(token_hash);

CREATE TABLE notif_config (
  id                 INTEGER PRIMARY KEY CHECK (id = 1),  -- fuerza una única fila
  slack_webhook_url  TEXT,
  telegram_bot_token TEXT,
  telegram_chat_id   TEXT,
  email_to           TEXT,
  updated_by         INTEGER REFERENCES users(id) ON DELETE SET NULL,
  updated_at         TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE monitor_services (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  url        TEXT NOT NULL,
  active     INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT
);

CREATE TABLE monitor_checks (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  service_id   INTEGER NOT NULL REFERENCES monitor_services(id) ON DELETE CASCADE,
  status       TEXT NOT NULL CHECK (status IN ('up','down')),
  status_code  INTEGER,
  latency_ms   INTEGER,
  checked_at   TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_monitor_checks_service_checked ON monitor_checks(service_id, checked_at);

-- Catálogo de módulos — estable, se referencia por código desde el middleware de autorización.
INSERT INTO modules (code) VALUES
  ('fichas'), ('rpa'), ('agentes'), ('monitoreo'), ('notificaciones');

-- Fila única de configuración de notificaciones (arranca vacía).
INSERT INTO notif_config (id) VALUES (1);
