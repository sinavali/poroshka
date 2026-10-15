import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';

const DB_DIR = path.resolve(process.cwd(), 'services/core-api/data');
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const DB_PATH = path.join(DB_DIR, 'logs.sqlite');
const db = new Database(DB_PATH);

// Configure SQLite for high-throughput write performance
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');

// Schema for structured local request logs & audit traces
db.exec(`
  CREATE TABLE IF NOT EXISTS request_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    method TEXT NOT NULL,
    path TEXT NOT NULL,
    status INTEGER NOT NULL,
    duration_ms REAL NOT NULL,
    ip TEXT,
    user_agent TEXT,
    user_id TEXT,
    client_uuid TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc'))
  );

  CREATE INDEX IF NOT EXISTS idx_req_logs_path ON request_logs(path, created_at);
  CREATE INDEX IF NOT EXISTS idx_req_logs_ip ON request_logs(ip, created_at);

  CREATE TABLE IF NOT EXISTS security_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_type TEXT NOT NULL,
    severity TEXT NOT NULL,
    ip TEXT,
    actor_id TEXT,
    details_json TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'utc'))
  );

  CREATE INDEX IF NOT EXISTS idx_sec_events_type ON security_events(event_type, created_at);
`);

export interface LogRequestEntry {
  method: string;
  path: string;
  status: number;
  duration_ms: number;
  ip?: string;
  user_agent?: string;
  user_id?: string;
  client_uuid?: string;
}

export interface SecurityEventEntry {
  event_type: string;
  severity: 'INFO' | 'WARN' | 'CRITICAL';
  ip?: string;
  actor_id?: string;
  details?: Record<string, unknown>;
}

const insertRequestLogStmt = db.prepare(`
  INSERT INTO request_logs (method, path, status, duration_ms, ip, user_agent, user_id, client_uuid)
  VALUES (@method, @path, @status, @duration_ms, @ip, @user_agent, @user_id, @client_uuid)
`);

const insertSecurityEventStmt = db.prepare(`
  INSERT INTO security_events (event_type, severity, ip, actor_id, details_json)
  VALUES (@event_type, @severity, @ip, @actor_id, @details_json)
`);

export const sqliteLogger = {
  logRequest(entry: LogRequestEntry): void {
    try {
      insertRequestLogStmt.run({
        method: entry.method,
        path: entry.path,
        status: entry.status,
        duration_ms: entry.duration_ms,
        ip: entry.ip || null,
        user_agent: entry.user_agent || null,
        user_id: entry.user_id || null,
        client_uuid: entry.client_uuid || null
      });
    } catch (err) {
      console.error('Failed to log request into SQLite:', err);
    }
  },

  logSecurityEvent(entry: SecurityEventEntry): void {
    try {
      insertSecurityEventStmt.run({
        event_type: entry.event_type,
        severity: entry.severity,
        ip: entry.ip || null,
        actor_id: entry.actor_id || null,
        details_json: entry.details ? JSON.stringify(entry.details) : null
      });
    } catch (err) {
      console.error('Failed to log security event into SQLite:', err);
    }
  },

  getRecentLogs(limit = 100): unknown[] {
    return db.prepare('SELECT * FROM request_logs ORDER BY id DESC LIMIT ?').all(limit);
  },

  getRecentSecurityEvents(limit = 100): unknown[] {
    return db.prepare('SELECT * FROM security_events ORDER BY id DESC LIMIT ?').all(limit);
  }
};
