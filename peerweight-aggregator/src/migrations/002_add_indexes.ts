import type { Migration } from './runner';

export const migration002: Migration = {
  id: 2,
  name: 'add_indexes',

  up: (db) => {
    // Indexes for endorsements table
    db.run('CREATE INDEX IF NOT EXISTS idx_endorsements_subject_url ON endorsements(subject_url)');
    db.run('CREATE INDEX IF NOT EXISTS idx_endorsements_subject_id ON endorsements(subject_id)');
    db.run('CREATE INDEX IF NOT EXISTS idx_endorsements_issuer ON endorsements(issuer)');
    db.run('CREATE INDEX IF NOT EXISTS idx_endorsements_issued ON endorsements(issued DESC)');
    db.run('CREATE INDEX IF NOT EXISTS idx_endorsements_categories ON endorsements(categories)');

    // Indexes for notes table
    db.run('CREATE INDEX IF NOT EXISTS idx_notes_subject_url ON notes(subject_url)');
    db.run('CREATE INDEX IF NOT EXISTS idx_notes_subject_id ON notes(subject_id)');
    db.run('CREATE INDEX IF NOT EXISTS idx_notes_issuer ON notes(issuer)');
    db.run('CREATE INDEX IF NOT EXISTS idx_notes_reply_to ON notes(reply_to)');

    // Indexes for crawl_logs table
    db.run('CREATE INDEX IF NOT EXISTS idx_crawl_logs_domain ON crawl_logs(domain)');
    db.run('CREATE INDEX IF NOT EXISTS idx_crawl_logs_status ON crawl_logs(status)');
    db.run('CREATE INDEX IF NOT EXISTS idx_crawl_logs_started_at ON crawl_logs(started_at DESC)');

    console.log('✓ Indexes created');
  },

  down: (db) => {
    // Drop endorsements indexes
    db.run('DROP INDEX IF EXISTS idx_endorsements_subject_url');
    db.run('DROP INDEX IF EXISTS idx_endorsements_subject_id');
    db.run('DROP INDEX IF EXISTS idx_endorsements_issuer');
    db.run('DROP INDEX IF EXISTS idx_endorsements_issued');
    db.run('DROP INDEX IF EXISTS idx_endorsements_categories');

    // Drop notes indexes
    db.run('DROP INDEX IF EXISTS idx_notes_subject_url');
    db.run('DROP INDEX IF EXISTS idx_notes_subject_id');
    db.run('DROP INDEX IF EXISTS idx_notes_issuer');
    db.run('DROP INDEX IF EXISTS idx_notes_reply_to');

    // Drop crawl_logs indexes
    db.run('DROP INDEX IF EXISTS idx_crawl_logs_domain');
    db.run('DROP INDEX IF EXISTS idx_crawl_logs_status');
    db.run('DROP INDEX IF EXISTS idx_crawl_logs_started_at');

    console.log('✓ Indexes dropped');
  }
};
