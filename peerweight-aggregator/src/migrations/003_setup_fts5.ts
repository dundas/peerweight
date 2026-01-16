import type { Migration } from './runner';

export const migration003: Migration = {
  id: 3,
  name: 'setup_fts5',

  up: (db) => {
    // Create FTS5 virtual table for endorsements
    db.run(`
      CREATE VIRTUAL TABLE IF NOT EXISTS endorsements_fts USING fts5(
        id UNINDEXED,
        claim,
        review,
        content=endorsements,
        content_rowid=rowid
      );
    `);

    // Create triggers to keep FTS table in sync
    db.run(`
      CREATE TRIGGER IF NOT EXISTS endorsements_fts_insert AFTER INSERT ON endorsements BEGIN
        INSERT INTO endorsements_fts(rowid, id, claim, review)
        VALUES (new.rowid, new.id, new.claim, new.review);
      END;
    `);

    db.run(`
      CREATE TRIGGER IF NOT EXISTS endorsements_fts_delete AFTER DELETE ON endorsements BEGIN
        DELETE FROM endorsements_fts WHERE rowid = old.rowid;
      END;
    `);

    db.run(`
      CREATE TRIGGER IF NOT EXISTS endorsements_fts_update AFTER UPDATE ON endorsements BEGIN
        DELETE FROM endorsements_fts WHERE rowid = old.rowid;
        INSERT INTO endorsements_fts(rowid, id, claim, review)
        VALUES (new.rowid, new.id, new.claim, new.review);
      END;
    `);

    // Create FTS5 virtual table for notes
    db.run(`
      CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts5(
        id UNINDEXED,
        text,
        content=notes,
        content_rowid=rowid
      );
    `);

    // Create triggers for notes FTS
    db.run(`
      CREATE TRIGGER IF NOT EXISTS notes_fts_insert AFTER INSERT ON notes BEGIN
        INSERT INTO notes_fts(rowid, id, text)
        VALUES (new.rowid, new.id, new.text);
      END;
    `);

    db.run(`
      CREATE TRIGGER IF NOT EXISTS notes_fts_delete AFTER DELETE ON notes BEGIN
        DELETE FROM notes_fts WHERE rowid = old.rowid;
      END;
    `);

    db.run(`
      CREATE TRIGGER IF NOT EXISTS notes_fts_update AFTER UPDATE ON notes BEGIN
        DELETE FROM notes_fts WHERE rowid = old.rowid;
        INSERT INTO notes_fts(rowid, id, text)
        VALUES (new.rowid, new.id, new.text);
      END;
    `);

    // Populate FTS tables with existing data
    db.run(`
      INSERT INTO endorsements_fts(rowid, id, claim, review)
      SELECT rowid, id, claim, review FROM endorsements;
    `);

    db.run(`
      INSERT INTO notes_fts(rowid, id, text)
      SELECT rowid, id, text FROM notes;
    `);

    console.log('✓ FTS5 search tables created and populated');
  },

  down: (db) => {
    // Drop triggers
    db.run('DROP TRIGGER IF EXISTS notes_fts_update');
    db.run('DROP TRIGGER IF EXISTS notes_fts_delete');
    db.run('DROP TRIGGER IF EXISTS notes_fts_insert');
    db.run('DROP TRIGGER IF EXISTS endorsements_fts_update');
    db.run('DROP TRIGGER IF EXISTS endorsements_fts_delete');
    db.run('DROP TRIGGER IF EXISTS endorsements_fts_insert');

    // Drop FTS tables
    db.run('DROP TABLE IF EXISTS notes_fts');
    db.run('DROP TABLE IF EXISTS endorsements_fts');

    console.log('✓ FTS5 search tables and triggers dropped');
  }
};
