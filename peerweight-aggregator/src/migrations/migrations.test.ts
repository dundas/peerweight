import { test, expect, beforeEach, afterEach } from 'bun:test';
import { Database } from 'bun:sqlite';
import { MigrationRunner } from './runner';
import { migration001 } from './001_add_production_tables';
import { migration002 } from './002_add_indexes';
import { migration003 } from './003_setup_fts5';
import { unlinkSync } from 'fs';

const TEST_DB = 'test-production-migrations.sqlite';

let db: Database;
let runner: MigrationRunner;

const allMigrations = [migration001, migration002, migration003];

beforeEach(() => {
  db = new Database(TEST_DB);

  // Create base tables that migrations depend on
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
      categories TEXT,
      claim TEXT,
      review TEXT,
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

  runner = new MigrationRunner(db);
});

afterEach(() => {
  db.close();
  try {
    unlinkSync(TEST_DB);
  } catch {}
});

test('Migration 001: creates production tables', () => {
  runner.up([migration001]);

  const tables = db.query("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('blacklisted_domains', 'admin_keys', 'crawl_logs')").all();
  expect(tables.length).toBe(3);
});

test('Migration 001: blacklisted_domains has correct schema', () => {
  runner.up([migration001]);

  // Insert test data to verify constraints
  db.run("INSERT INTO blacklisted_domains (domain, reason, blacklisted_at) VALUES ('spam.com', 'Spam domain', '2026-01-15T00:00:00Z')");

  const result = db.query('SELECT * FROM blacklisted_domains WHERE domain = ?').get('spam.com') as any;
  expect(result.domain).toBe('spam.com');
  expect(result.reason).toBe('Spam domain');
});

test('Migration 001: admin_keys has correct schema', () => {
  runner.up([migration001]);

  db.run("INSERT INTO admin_keys (key_hash, description, created_at) VALUES ('hash123', 'Test key', '2026-01-15T00:00:00Z')");

  const result = db.query('SELECT * FROM admin_keys WHERE key_hash = ?').get('hash123') as any;
  expect(result.key_hash).toBe('hash123');
  expect(result.description).toBe('Test key');
});

test('Migration 001: crawl_logs has correct schema with status constraint', () => {
  runner.up([migration001]);

  db.run("INSERT INTO crawl_logs (domain, started_at, status) VALUES ('example.com', '2026-01-15T00:00:00Z', 'pending')");

  const result = db.query('SELECT * FROM crawl_logs WHERE domain = ?').get('example.com') as any;
  expect(result.status).toBe('pending');

  // Test constraint - should fail with invalid status
  expect(() => {
    db.run("INSERT INTO crawl_logs (domain, started_at, status) VALUES ('bad.com', '2026-01-15T00:00:00Z', 'invalid')");
  }).toThrow();
});

test('Migration 002: creates indexes', () => {
  runner.up([migration001, migration002]);

  const indexes = db.query("SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%'").all();
  expect(indexes.length).toBeGreaterThan(10);
});

test('Migration 003: creates FTS5 tables', () => {
  runner.up([migration001, migration002, migration003]);

  const ftsTables = db.query("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%_fts'").all();
  expect(ftsTables.length).toBe(2);
});

test('Migration 003: FTS search works for endorsements', () => {
  runner.up(allMigrations);

  // Insert test endorsement
  db.run(`
    INSERT INTO endorsements (id, issuer, subject_url, weight, disclosure, categories, claim, review, issued, proof_value)
    VALUES ('urn:uuid:123', 'did:peerweight:test', 'https://test.com', 5, 'editorial', '["test"]', 'Great product', 'This is a detailed review of the product', '2026-01-15T00:00:00Z', 'proof')
  `);

  // Search using FTS
  const results = db.query("SELECT id, claim FROM endorsements_fts WHERE endorsements_fts MATCH 'product'").all();
  expect(results.length).toBe(1);
  expect((results[0] as any).id).toBe('urn:uuid:123');
});

test('Migration 003: FTS search works for notes', () => {
  runner.up(allMigrations);

  // Insert test note
  db.run(`
    INSERT INTO notes (id, issuer, text, issued, proof_value)
    VALUES ('urn:uuid:456', 'did:peerweight:test', 'This is an important note about security', '2026-01-15T00:00:00Z', 'proof')
  `);

  // Search using FTS
  const results = db.query("SELECT id, text FROM notes_fts WHERE notes_fts MATCH 'security'").all();
  expect(results.length).toBe(1);
  expect((results[0] as any).id).toBe('urn:uuid:456');
});

test('Migrations: can rollback in correct order', () => {
  runner.up(allMigrations);

  // All tables should exist
  let tables = db.query("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('blacklisted_domains', 'endorsements_fts', 'notes_fts')").all();
  expect(tables.length).toBe(3);

  // Rollback to migration 2 (should drop FTS tables)
  runner.down(allMigrations, 2);

  tables = db.query("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%_fts'").all();
  expect(tables.length).toBe(0);

  // Production tables should still exist
  tables = db.query("SELECT name FROM sqlite_master WHERE type='table' AND name = 'blacklisted_domains'").all();
  expect(tables.length).toBe(1);
});
