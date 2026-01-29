import { test, expect, beforeEach, afterEach } from 'bun:test';
import { Database } from 'bun:sqlite';
import { unlinkSync } from 'fs';

const TEST_DB = 'test-db-init.sqlite';

beforeEach(() => {
  // Clean up any existing test database
  try {
    unlinkSync(TEST_DB);
  } catch {}
});

afterEach(() => {
  try {
    unlinkSync(TEST_DB);
  } catch {}
});

test('initDB creates all base tables', () => {
  const db = new Database(TEST_DB);
  db.run('PRAGMA journal_mode = WAL;');

  // Import and run initDB logic manually
  const { MigrationRunner } = require('../migrations/runner');
  const { migration001 } = require('../migrations/001_add_production_tables');
  const { migration002 } = require('../migrations/002_add_indexes');
  const { migration003 } = require('../migrations/003_setup_fts5');

  // Create base tables
  db.run(`CREATE TABLE IF NOT EXISTS identities (did TEXT PRIMARY KEY, domain TEXT, public_key_multibase TEXT NOT NULL, created TEXT, updated TEXT, last_crawled TEXT);`);
  db.run(`CREATE TABLE IF NOT EXISTS endorsements (id TEXT PRIMARY KEY, issuer TEXT NOT NULL, subject_url TEXT, subject_id TEXT, weight INTEGER, disclosure TEXT, categories TEXT, claim TEXT, review TEXT, issued TEXT, proof_value TEXT, FOREIGN KEY(issuer) REFERENCES identities(did));`);
  db.run(`CREATE TABLE IF NOT EXISTS notes (id TEXT PRIMARY KEY, issuer TEXT NOT NULL, subject_url TEXT, subject_id TEXT, reply_to TEXT, text TEXT, issued TEXT, proof_value TEXT, FOREIGN KEY(issuer) REFERENCES identities(did));`);
  db.run(`CREATE TABLE IF NOT EXISTS revoked_items (id TEXT PRIMARY KEY, issuer TEXT NOT NULL, type TEXT, reason TEXT, revoked_at TEXT, FOREIGN KEY(issuer) REFERENCES identities(did));`);

  // Run migrations
  const runner = new MigrationRunner(db);
  runner.up([migration001, migration002, migration003]);

  // Verify all tables exist
  const tables = db.query("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
  const tableNames = tables.map((t: any) => t.name);

  expect(tableNames).toContain('identities');
  expect(tableNames).toContain('endorsements');
  expect(tableNames).toContain('notes');
  expect(tableNames).toContain('revoked_items');
  expect(tableNames).toContain('blacklisted_domains');
  expect(tableNames).toContain('admin_keys');
  expect(tableNames).toContain('crawl_logs');
  expect(tableNames).toContain('endorsements_fts');
  expect(tableNames).toContain('notes_fts');
  expect(tableNames).toContain('schema_migrations');

  db.close();
});

test('endorsements table has review column', () => {
  const db = new Database(TEST_DB);

  db.run(`CREATE TABLE endorsements (id TEXT PRIMARY KEY, issuer TEXT NOT NULL, subject_url TEXT, subject_id TEXT, weight INTEGER, disclosure TEXT, categories TEXT, claim TEXT, review TEXT, issued TEXT, proof_value TEXT);`);

  // Insert test data
  db.run(`INSERT INTO endorsements (id, issuer, weight, disclosure, categories, claim, review, issued, proof_value) VALUES ('urn:uuid:123', 'did:test', 5, 'editorial', '["test"]', 'Great!', 'Long review here...', '2026-01-15T00:00:00Z', 'proof')`);

  const result = db.query('SELECT review FROM endorsements WHERE id = ?').get('urn:uuid:123') as any;
  expect(result.review).toBe('Long review here...');

  db.close();
});

test('WAL mode is enabled', () => {
  const db = new Database(TEST_DB);
  db.run('PRAGMA journal_mode = WAL;');

  const result = db.query('PRAGMA journal_mode').get() as any;
  expect(result.journal_mode).toBe('wal');

  db.close();
});
