CREATE TABLE IF NOT EXISTS devices (
  id TEXT PRIMARY KEY,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at INTEGER NOT NULL,
  revoked INTEGER NOT NULL DEFAULT 0 CHECK (revoked IN (0, 1))
);
CREATE TABLE IF NOT EXISTS requests (
  id TEXT PRIMARY KEY,
  device_id TEXT NOT NULL REFERENCES devices(id),
  stage TEXT NOT NULL CHECK (stage IN ('transcription', 'reply', 'summary')),
  month TEXT NOT NULL,
  reserved_micro_usd INTEGER NOT NULL CHECK (reserved_micro_usd > 0),
  charged_micro_usd INTEGER CHECK (charged_micro_usd >= 0),
  status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'unknown')),
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS requests_month ON requests(month);
