PRAGMA journal_mode=WAL;
PRAGMA foreign_keys=ON;

CREATE TABLE IF NOT EXISTS orders (
  order_id TEXT PRIMARY KEY,
  table_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  current_state TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  urge_requested INTEGER NOT NULL DEFAULT 0,
  urge_count INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS order_items (
  item_id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  dish_name TEXT NOT NULL,
  qty INTEGER NOT NULL,
  item_state TEXT NOT NULL,
  FOREIGN KEY(order_id) REFERENCES orders(order_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS urge_events (
  event_id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  table_id TEXT NOT NULL,
  source TEXT NOT NULL,
  confidence REAL,
  request_id TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS asr_calls (
  call_id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL,
  table_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  latency_ms INTEGER NOT NULL,
  success INTEGER NOT NULL,
  error_code TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS device_status (
  device_id TEXT PRIMARY KEY,
  device_type TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  is_online INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_logs (
  log_id TEXT PRIMARY KEY,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  payload TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_orders_updated_at ON orders(updated_at);
CREATE INDEX IF NOT EXISTS idx_urge_events_created_at ON urge_events(created_at);
CREATE INDEX IF NOT EXISTS idx_asr_calls_created_at ON asr_calls(created_at);
