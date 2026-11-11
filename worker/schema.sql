-- Dedicated BEYOND BERZERK entries. Never touch Orbit or Luck Machine.
CREATE TABLE IF NOT EXISTS beyond_berzerk_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  initials TEXT NOT NULL,
  score INTEGER NOT NULL CHECK(score >= 1),
  wave INTEGER NOT NULL CHECK(wave >= 1),
  robots INTEGER NOT NULL CHECK(robots >= 0),
  leviathan INTEGER NOT NULL DEFAULT 0 CHECK(leviathan IN (0,1)),
  build TEXT NOT NULL,
  ruleset TEXT NOT NULL DEFAULT 'survival-v1',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_bb_world_rank
  ON beyond_berzerk_entries(score DESC,wave DESC,robots DESC,created_at ASC,id ASC);