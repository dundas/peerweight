import { Database } from 'bun:sqlite';

export const db = new Database('peerweight.sqlite');

// Enable WAL mode for concurrency
db.run('PRAGMA journal_mode = WAL;');

// Initialize Schema
export function initDB() {
  db.run(`
    CREATE TABLE IF NOT EXISTS identities (
      did TEXT PRIMARY KEY,
      domain TEXT,
      public_key_multibase TEXT NOT NULL,
      created TEXT,
      updated TEXT,
      last_crawled TEXT
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS endorsements (
      id TEXT PRIMARY KEY,
      issuer TEXT NOT NULL,
      subject_url TEXT,
      subject_id TEXT,
      weight INTEGER,
      disclosure TEXT,
      categories TEXT, -- JSON array
      claim TEXT,
      issued TEXT,
      proof_value TEXT,
      FOREIGN KEY(issuer) REFERENCES identities(did)
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      issuer TEXT NOT NULL,
      subject_url TEXT,
      subject_id TEXT,
      reply_to TEXT,
      text TEXT,
      issued TEXT,
      proof_value TEXT,
      FOREIGN KEY(issuer) REFERENCES identities(did)
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS revoked_items (
      id TEXT PRIMARY KEY,
      issuer TEXT NOT NULL,
      type TEXT,
      reason TEXT,
      revoked_at TEXT,
      FOREIGN KEY(issuer) REFERENCES identities(did)
    );
  `);

  console.log('Database initialized.');
}
