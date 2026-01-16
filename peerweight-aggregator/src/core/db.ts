import { Database } from 'bun:sqlite';
import { MigrationRunner } from '../migrations/runner';
import { migration001 } from '../migrations/001_add_production_tables';
import { migration002 } from '../migrations/002_add_indexes';
import { migration003 } from '../migrations/003_setup_fts5';

export const db = new Database('peerweight.sqlite');

// Enable WAL mode for concurrency
db.run('PRAGMA journal_mode = WAL;');

// All migrations in order
const migrations = [migration001, migration002, migration003];

// Initialize Schema
export function initDB() {
  // Create base tables (required before migrations)
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
      review TEXT, -- Long-form review (markdown)
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

  // Run migrations
  const runner = new MigrationRunner(db);
  runner.up(migrations);

  console.log('Database initialized with all migrations.');
}
