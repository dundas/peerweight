import { mechStorage } from '../services/mech-storage';

// Table definitions for mech-storage PostgreSQL
const TABLES = {
  identities: {
    columns: [
      { name: 'did', type: 'text', primaryKey: true },
      { name: 'domain', type: 'text', nullable: true },
      { name: 'public_key_multibase', type: 'text', nullable: false },
      { name: 'created', type: 'text', nullable: true },
      { name: 'updated', type: 'text', nullable: true },
      { name: 'last_crawled', type: 'text', nullable: true },
    ],
    indexes: [
      { name: 'idx_identities_domain', columns: ['domain'] },
    ],
  },
  endorsements: {
    columns: [
      { name: 'id', type: 'text', primaryKey: true },
      { name: 'issuer', type: 'text', nullable: false },
      { name: 'subject_url', type: 'text', nullable: true },
      { name: 'subject_id', type: 'text', nullable: true },
      { name: 'weight', type: 'integer', nullable: true },
      { name: 'disclosure', type: 'text', nullable: true },
      { name: 'categories', type: 'jsonb', nullable: true },
      { name: 'claim', type: 'text', nullable: true },
      { name: 'review', type: 'text', nullable: true },
      { name: 'issued', type: 'text', nullable: true },
      { name: 'proof_value', type: 'text', nullable: true },
    ],
    indexes: [
      { name: 'idx_endorsements_issuer', columns: ['issuer'] },
      { name: 'idx_endorsements_subject_url', columns: ['subject_url'] },
      { name: 'idx_endorsements_subject_id', columns: ['subject_id'] },
      { name: 'idx_endorsements_issued', columns: ['issued'] },
    ],
  },
  notes: {
    columns: [
      { name: 'id', type: 'text', primaryKey: true },
      { name: 'issuer', type: 'text', nullable: false },
      { name: 'subject_url', type: 'text', nullable: true },
      { name: 'subject_id', type: 'text', nullable: true },
      { name: 'reply_to', type: 'text', nullable: true },
      { name: 'text', type: 'text', nullable: true },
      { name: 'issued', type: 'text', nullable: true },
      { name: 'proof_value', type: 'text', nullable: true },
    ],
    indexes: [
      { name: 'idx_notes_issuer', columns: ['issuer'] },
      { name: 'idx_notes_subject_url', columns: ['subject_url'] },
      { name: 'idx_notes_subject_id', columns: ['subject_id'] },
      { name: 'idx_notes_issued', columns: ['issued'] },
    ],
  },
  revoked_items: {
    columns: [
      { name: 'id', type: 'text', primaryKey: true },
      { name: 'issuer', type: 'text', nullable: false },
      { name: 'type', type: 'text', nullable: true },
      { name: 'reason', type: 'text', nullable: true },
      { name: 'revoked_at', type: 'text', nullable: true },
    ],
    indexes: [
      { name: 'idx_revoked_issuer', columns: ['issuer'] },
    ],
  },
  blacklisted_domains: {
    columns: [
      { name: 'domain', type: 'text', primaryKey: true },
      { name: 'reason', type: 'text', nullable: true },
      { name: 'blacklisted_at', type: 'text', nullable: false },
    ],
    indexes: [],
  },
  crawl_logs: {
    columns: [
      { name: 'id', type: 'text', primaryKey: true },
      { name: 'domain', type: 'text', nullable: false },
      { name: 'started_at', type: 'text', nullable: false },
      { name: 'completed_at', type: 'text', nullable: true },
      { name: 'status', type: 'text', nullable: false },
      { name: 'error_message', type: 'text', nullable: true },
      { name: 'endorsements_found', type: 'integer', nullable: true },
      { name: 'notes_found', type: 'integer', nullable: true },
    ],
    indexes: [
      { name: 'idx_crawl_logs_domain', columns: ['domain'] },
      { name: 'idx_crawl_logs_started_at', columns: ['started_at'] },
    ],
  },
};

// Database abstraction layer
export const db = {
  // Identities
  identities: {
    async upsert(identity: {
      did: string;
      domain?: string;
      public_key_multibase: string;
      created?: string;
      updated?: string;
      last_crawled?: string;
    }) {
      const existing = await mechStorage.getById('identities', identity.did);
      if (existing) {
        return mechStorage.update('identities', identity.did, identity);
      }
      return mechStorage.insert('identities', identity);
    },
    async getByDid(did: string) {
      return mechStorage.getById('identities', did);
    },
    async getByDomain(domain: string) {
      const results = await mechStorage.query('identities', { where: { domain } });
      return results[0] || null;
    },
    async updateLastCrawled(did: string, timestamp: string) {
      return mechStorage.update('identities', did, { last_crawled: timestamp });
    },
  },

  // Endorsements
  endorsements: {
    async insert(endorsement: {
      id: string;
      issuer: string;
      subject_url?: string;
      subject_id?: string;
      weight?: number;
      disclosure?: string;
      categories?: string[];
      claim?: string;
      review?: string;
      issued?: string;
      proof_value?: string;
    }) {
      return mechStorage.insert('endorsements', endorsement);
    },
    async getBySubject(subject: string) {
      // Query by subject_url OR subject_id
      const byUrl = await mechStorage.query('endorsements', {
        where: { subject_url: subject },
        orderBy: 'issued',
        orderDir: 'DESC',
      });
      const byId = await mechStorage.query('endorsements', {
        where: { subject_id: subject },
        orderBy: 'issued',
        orderDir: 'DESC',
      });
      // Dedupe by id
      const seen = new Set<string>();
      const results: any[] = [];
      for (const e of [...byUrl, ...byId]) {
        if (!seen.has(e.id)) {
          seen.add(e.id);
          results.push(e);
        }
      }
      return results;
    },
    async exists(id: string): Promise<boolean> {
      const existing = await mechStorage.getById('endorsements', id);
      return !!existing;
    },
  },

  // Notes
  notes: {
    async insert(note: {
      id: string;
      issuer: string;
      subject_url?: string;
      subject_id?: string;
      reply_to?: string;
      text?: string;
      issued?: string;
      proof_value?: string;
    }) {
      return mechStorage.insert('notes', note);
    },
    async getBySubject(subject: string) {
      const byUrl = await mechStorage.query('notes', {
        where: { subject_url: subject },
        orderBy: 'issued',
        orderDir: 'ASC',
      });
      const byId = await mechStorage.query('notes', {
        where: { subject_id: subject },
        orderBy: 'issued',
        orderDir: 'ASC',
      });
      const seen = new Set<string>();
      const results: any[] = [];
      for (const n of [...byUrl, ...byId]) {
        if (!seen.has(n.id)) {
          seen.add(n.id);
          results.push(n);
        }
      }
      return results;
    },
    async exists(id: string): Promise<boolean> {
      const existing = await mechStorage.getById('notes', id);
      return !!existing;
    },
  },

  // Revoked items
  revokedItems: {
    async insert(item: {
      id: string;
      issuer: string;
      type?: string;
      reason?: string;
      revoked_at?: string;
    }) {
      return mechStorage.insert('revoked_items', item);
    },
    async isRevoked(id: string): Promise<boolean> {
      const existing = await mechStorage.getById('revoked_items', id);
      return !!existing;
    },
  },
};

// Initialize database schema
export async function initDB() {
  console.log('Provisioning mech-storage database...');
  await mechStorage.provision();

  console.log('Creating tables...');
  for (const [tableName, schema] of Object.entries(TABLES)) {
    await mechStorage.createTable(tableName, schema.columns, schema.indexes);
    console.log(`  - ${tableName} ready`);
  }

  console.log('Database initialized with mech-storage PostgreSQL.');
}
