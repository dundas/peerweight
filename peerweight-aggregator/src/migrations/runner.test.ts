import { test, expect, beforeEach, afterEach } from 'bun:test';
import { Database } from 'bun:sqlite';
import { MigrationRunner, type Migration } from './runner';
import { unlinkSync } from 'fs';

const TEST_DB = 'test-migrations.sqlite';

let db: Database;
let runner: MigrationRunner;

const testMigrations: Migration[] = [
  {
    id: 1,
    name: 'create_users_table',
    up: (db) => {
      db.run('CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)');
    },
    down: (db) => {
      db.run('DROP TABLE users');
    }
  },
  {
    id: 2,
    name: 'create_posts_table',
    up: (db) => {
      db.run('CREATE TABLE posts (id INTEGER PRIMARY KEY, title TEXT)');
    },
    down: (db) => {
      db.run('DROP TABLE posts');
    }
  },
  {
    id: 3,
    name: 'add_users_email',
    up: (db) => {
      db.run('ALTER TABLE users ADD COLUMN email TEXT');
    },
    down: (db) => {
      db.run('ALTER TABLE users DROP COLUMN email');
    }
  }
];

beforeEach(() => {
  db = new Database(TEST_DB);
  runner = new MigrationRunner(db);
});

afterEach(() => {
  db.close();
  try {
    unlinkSync(TEST_DB);
  } catch {}
});

test('MigrationRunner: initializes schema_migrations table', () => {
  const result = db.query("SELECT name FROM sqlite_master WHERE type='table' AND name='schema_migrations'").all();
  expect(result.length).toBe(1);
});

test('MigrationRunner: getAppliedMigrations returns empty array initially', () => {
  const applied = runner.getAppliedMigrations();
  expect(applied).toEqual([]);
});

test('MigrationRunner: up applies pending migrations', () => {
  runner.up(testMigrations);

  const applied = runner.getAppliedMigrations();
  expect(applied).toEqual([1, 2, 3]);

  // Verify tables were created
  const users = db.query("SELECT name FROM sqlite_master WHERE type='table' AND name='users'").all();
  const posts = db.query("SELECT name FROM sqlite_master WHERE type='table' AND name='posts'").all();

  expect(users.length).toBe(1);
  expect(posts.length).toBe(1);
});

test('MigrationRunner: up applies migrations up to target', () => {
  runner.up(testMigrations, 2);

  const applied = runner.getAppliedMigrations();
  expect(applied).toEqual([1, 2]);

  const users = db.query("SELECT name FROM sqlite_master WHERE type='table' AND name='users'").all();
  const posts = db.query("SELECT name FROM sqlite_master WHERE type='table' AND name='posts'").all();

  expect(users.length).toBe(1);
  expect(posts.length).toBe(1);
});

test('MigrationRunner: isMigrationApplied checks correctly', () => {
  runner.up(testMigrations, 1);

  expect(runner.isMigrationApplied(1)).toBe(true);
  expect(runner.isMigrationApplied(2)).toBe(false);
  expect(runner.isMigrationApplied(3)).toBe(false);
});

test('MigrationRunner: down rolls back last migration', () => {
  runner.up(testMigrations);

  const beforeRollback = runner.getAppliedMigrations();
  expect(beforeRollback).toEqual([1, 2, 3]);

  runner.down(testMigrations);

  const afterRollback = runner.getAppliedMigrations();
  expect(afterRollback).toEqual([1, 2]);
});

test('MigrationRunner: down rolls back to specific target', () => {
  runner.up(testMigrations);

  runner.down(testMigrations, 1);

  const applied = runner.getAppliedMigrations();
  expect(applied).toEqual([1]);
});

test('MigrationRunner: status shows migration state', () => {
  runner.up(testMigrations, 2);

  const status = runner.status(testMigrations);

  expect(status).toEqual([
    { id: 1, name: 'create_users_table', applied: true },
    { id: 2, name: 'create_posts_table', applied: true },
    { id: 3, name: 'add_users_email', applied: false }
  ]);
});

test('MigrationRunner: handles migration failure gracefully', () => {
  const failingMigrations: Migration[] = [
    {
      id: 1,
      name: 'failing_migration',
      up: () => {
        throw new Error('Migration failed');
      },
      down: () => {}
    }
  ];

  expect(() => runner.up(failingMigrations)).toThrow('Migration failed');

  const applied = runner.getAppliedMigrations();
  expect(applied).toEqual([]);
});
