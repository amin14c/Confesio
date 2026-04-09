import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'confesio.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    anonymousId TEXT PRIMARY KEY,
    passwordHash TEXT NOT NULL,
    createdAt INTEGER NOT NULL,
    lastSeen INTEGER NOT NULL,
    credits INTEGER DEFAULT 0,
    confessions INTEGER DEFAULT 0,
    guardian_sessions INTEGER DEFAULT 0,
    avg_rating REAL DEFAULT 0.0,
    completed_sessions INTEGER DEFAULT 0,
    pref_lang TEXT DEFAULT 'ar',
    pref_session_duration INTEGER DEFAULT 15,
    pref_silent_mode BOOLEAN DEFAULT 0,
    pref_weight_preference TEXT DEFAULT 'any',
    is_suspended BOOLEAN DEFAULT 0,
    suspension_until INTEGER DEFAULT 0,
    report_count INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS sessions_log (
    id TEXT PRIMARY KEY,
    confessorHash TEXT,
    guardianHash TEXT,
    duration INTEGER,
    rating REAL,
    timestamp INTEGER
  );

  CREATE TABLE IF NOT EXISTS badges (
    anonymousId TEXT,
    badgeId TEXT,
    earnedAt INTEGER,
    PRIMARY KEY (anonymousId, badgeId)
  );

  CREATE TABLE IF NOT EXISTS pending_messages (
    id TEXT PRIMARY KEY,
    recipientHash TEXT,
    content TEXT,
    timestamp INTEGER
  );

  CREATE TABLE IF NOT EXISTS echo_pool (
    id TEXT PRIMARY KEY,
    authorHash TEXT,
    content TEXT,
    timestamp INTEGER
  );

  CREATE TABLE IF NOT EXISTS login_attempts (
    ip TEXT,
    timestamp INTEGER,
    success BOOLEAN
  );
`);

export default db;
