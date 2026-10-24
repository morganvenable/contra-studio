-- Feedback notes from Contra Studio. No IP addresses are stored here.
CREATE TABLE feedback (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'fixed', 'wontfix')),
  status_note TEXT,
  message TEXT NOT NULL,
  name TEXT,
  dance_id TEXT NOT NULL,
  dance_title TEXT NOT NULL,
  figure_index INTEGER,
  figure_label TEXT,
  beat REAL,
  context TEXT NOT NULL
);

CREATE INDEX feedback_dance ON feedback (dance_id, created_at);
CREATE INDEX feedback_status ON feedback (status, created_at);

-- Per-visitor counters. `key` is a salted SHA-256 of the IP address and the
-- hour, so it cannot be reversed or linked across hours. Old rows are deleted.
CREATE TABLE rate_limits (
  key TEXT NOT NULL,
  window_start INTEGER NOT NULL,
  count INTEGER NOT NULL,
  PRIMARY KEY (key, window_start)
);
