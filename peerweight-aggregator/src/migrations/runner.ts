import { Database } from 'bun:sqlite';

export interface Migration {
  id: number;
  name: string;
  up: (db: Database) => void;
  down: (db: Database) => void;
}

export class MigrationRunner {
  private db: Database;

  constructor(db: Database) {
    this.db = db;
    this.initMigrationsTable();
  }

  private initMigrationsTable() {
    this.db.run(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at TEXT NOT NULL
      );
    `);
  }

  /**
   * Get list of applied migration IDs
   */
  getAppliedMigrations(): number[] {
    const result = this.db.query('SELECT id FROM schema_migrations ORDER BY id ASC').all();
    return result.map((row: any) => row.id);
  }

  /**
   * Check if a specific migration has been applied
   */
  isMigrationApplied(id: number): boolean {
    const result = this.db.query('SELECT id FROM schema_migrations WHERE id = $id').get({ $id: id });
    return result !== null;
  }

  /**
   * Run pending migrations up to target (or all if target not specified)
   */
  up(migrations: Migration[], target?: number) {
    const applied = this.getAppliedMigrations();
    const lastApplied = applied.length > 0 ? Math.max(...applied) : 0;

    const pending = migrations.filter(m =>
      m.id > lastApplied && (target === undefined || m.id <= target)
    );

    if (pending.length === 0) {
      console.log('No pending migrations to run.');
      return;
    }

    for (const migration of pending) {
      console.log(`Running migration ${migration.id}: ${migration.name}`);

      try {
        migration.up(this.db);

        this.db.run(
          'INSERT INTO schema_migrations (id, name, applied_at) VALUES ($id, $name, $now)',
          {
            $id: migration.id,
            $name: migration.name,
            $now: new Date().toISOString()
          }
        );

        console.log(`✓ Migration ${migration.id} applied successfully`);
      } catch (error) {
        console.error(`✗ Migration ${migration.id} failed:`, error);
        throw error;
      }
    }
  }

  /**
   * Rollback migrations down to target (or rollback last if target not specified)
   */
  down(migrations: Migration[], target?: number) {
    const applied = this.getAppliedMigrations();

    if (applied.length === 0) {
      console.log('No migrations to rollback.');
      return;
    }

    const lastApplied = Math.max(...applied);
    const rollbackTo = target !== undefined ? target : lastApplied - 1;

    const toRollback = migrations
      .filter(m => m.id > rollbackTo && applied.includes(m.id))
      .sort((a, b) => b.id - a.id); // Rollback in reverse order

    if (toRollback.length === 0) {
      console.log('No migrations to rollback.');
      return;
    }

    for (const migration of toRollback) {
      console.log(`Rolling back migration ${migration.id}: ${migration.name}`);

      try {
        migration.down(this.db);

        this.db.run('DELETE FROM schema_migrations WHERE id = $id', {
          $id: migration.id
        });

        console.log(`✓ Migration ${migration.id} rolled back successfully`);
      } catch (error) {
        console.error(`✗ Migration ${migration.id} rollback failed:`, error);
        throw error;
      }
    }
  }

  /**
   * Get migration status
   */
  status(migrations: Migration[]): { id: number; name: string; applied: boolean }[] {
    const applied = this.getAppliedMigrations();

    return migrations.map(m => ({
      id: m.id,
      name: m.name,
      applied: applied.includes(m.id)
    }));
  }
}
