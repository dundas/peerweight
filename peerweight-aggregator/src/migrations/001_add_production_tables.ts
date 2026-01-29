import type { Migration } from './runner';

export const migration001: Migration = {
  id: 1,
  name: 'add_production_tables',

  up: (db) => {
    // Blacklisted domains table
    db.run(`
      CREATE TABLE IF NOT EXISTS blacklisted_domains (
        domain TEXT PRIMARY KEY,
        reason TEXT,
        blacklisted_at TEXT NOT NULL
      );
    `);

    // Admin API keys table
    db.run(`
      CREATE TABLE IF NOT EXISTS admin_keys (
        key_hash TEXT PRIMARY KEY,
        description TEXT,
        created_at TEXT NOT NULL,
        last_used TEXT
      );
    `);

    // Crawl logs table
    db.run(`
      CREATE TABLE IF NOT EXISTS crawl_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        domain TEXT NOT NULL,
        started_at TEXT NOT NULL,
        completed_at TEXT,
        status TEXT NOT NULL CHECK(status IN ('pending', 'success', 'error')),
        error_message TEXT,
        endorsements_found INTEGER DEFAULT 0,
        notes_found INTEGER DEFAULT 0
      );
    `);

    console.log('✓ Production tables created');
  },

  down: (db) => {
    db.run('DROP TABLE IF EXISTS crawl_logs');
    db.run('DROP TABLE IF EXISTS admin_keys');
    db.run('DROP TABLE IF EXISTS blacklisted_domains');

    console.log('✓ Production tables dropped');
  }
};
