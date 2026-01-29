import { mechStorage } from '../services/mech-storage';

/**
 * Type-safe query helpers for common database operations
 * Uses mech-storage PostgreSQL backend
 */

export interface Endorsement {
  id: string;
  issuer: string;
  subject_url: string | null;
  subject_id: string | null;
  weight: number | null;
  disclosure: string | null;
  categories: string[] | null;
  claim: string | null;
  review: string | null;
  issued: string | null;
  proof_value: string | null;
}

export interface Note {
  id: string;
  issuer: string;
  subject_url: string | null;
  subject_id: string | null;
  reply_to: string | null;
  text: string | null;
  issued: string | null;
  proof_value: string | null;
}

export interface Identity {
  did: string;
  domain: string | null;
  public_key_multibase: string;
  created: string | null;
  updated: string | null;
  last_crawled: string | null;
}

export interface CrawlLog {
  id: string;
  domain: string;
  started_at: string;
  completed_at: string | null;
  status: 'pending' | 'success' | 'error';
  error_message: string | null;
  endorsements_found: number;
  notes_found: number;
}

export interface BlacklistedDomain {
  domain: string;
  reason: string | null;
  blacklisted_at: string;
}

/**
 * Get all endorsements for a given subject (URL or DID)
 */
export async function getEndorsementsBySubject(subject: string): Promise<Endorsement[]> {
  const byUrl = await mechStorage.query<Endorsement>('endorsements', {
    where: { subject_url: subject },
    orderBy: 'issued',
    orderDir: 'DESC',
  });
  const byId = await mechStorage.query<Endorsement>('endorsements', {
    where: { subject_id: subject },
    orderBy: 'issued',
    orderDir: 'DESC',
  });

  // Dedupe by id
  const seen = new Set<string>();
  const results: Endorsement[] = [];
  for (const e of [...byUrl, ...byId]) {
    if (!seen.has(e.id)) {
      seen.add(e.id);
      results.push(e);
    }
  }
  return results;
}

/**
 * Get all notes for a given subject (URL or DID)
 */
export async function getNotesBySubject(subject: string): Promise<Note[]> {
  const byUrl = await mechStorage.query<Note>('notes', {
    where: { subject_url: subject },
    orderBy: 'issued',
    orderDir: 'ASC',
  });
  const byId = await mechStorage.query<Note>('notes', {
    where: { subject_id: subject },
    orderBy: 'issued',
    orderDir: 'ASC',
  });

  const seen = new Set<string>();
  const results: Note[] = [];
  for (const n of [...byUrl, ...byId]) {
    if (!seen.has(n.id)) {
      seen.add(n.id);
      results.push(n);
    }
  }
  return results;
}

/**
 * Get all endorsements issued by a specific DID
 */
export async function getEndorsementsByIssuer(issuer: string): Promise<Endorsement[]> {
  return mechStorage.query<Endorsement>('endorsements', {
    where: { issuer },
    orderBy: 'issued',
    orderDir: 'DESC',
  });
}

/**
 * Get identity by DID
 */
export async function getIdentityByDid(did: string): Promise<Identity | null> {
  return mechStorage.getById<Identity>('identities', did);
}

/**
 * Get identity by domain
 */
export async function getIdentityByDomain(domain: string): Promise<Identity | null> {
  const results = await mechStorage.query<Identity>('identities', {
    where: { domain },
    limit: 1,
  });
  return results[0] || null;
}

/**
 * Check if a domain is blacklisted
 */
export async function isBlacklisted(domain: string): Promise<boolean> {
  // Use queryAll because blacklisted_domains has non-id primary key
  try {
    const all = await mechStorage.queryAll<BlacklistedDomain>('blacklisted_domains');
    return all.some((b) => b.domain === domain);
  } catch (err) {
    // Table might not exist yet
    return false;
  }
}

/**
 * Add a domain to the blacklist
 */
export async function addToBlacklist(domain: string, reason: string | null = null): Promise<void> {
  // Check if already blacklisted using query (non-id primary key)
  const existing = await isBlacklisted(domain);
  if (existing) {
    // For tables with non-id primary keys, we need to delete and re-insert
    // since update() uses the id column
    await mechStorage.delete('blacklisted_domains', domain);
  }
  await mechStorage.insert('blacklisted_domains', {
    domain,
    reason,
    blacklisted_at: new Date().toISOString(),
  });
}

/**
 * Remove a domain from the blacklist
 */
export async function removeFromBlacklist(domain: string): Promise<void> {
  await mechStorage.delete('blacklisted_domains', domain);
}

/**
 * Get recent crawl logs for a domain
 */
export async function getCrawlLogsByDomain(domain: string, limit: number = 10): Promise<CrawlLog[]> {
  return mechStorage.query<CrawlLog>('crawl_logs', {
    where: { domain },
    orderBy: 'started_at',
    orderDir: 'DESC',
    limit,
  });
}

/**
 * Get the most recent crawl log for a domain
 */
export async function getLatestCrawlLog(domain: string): Promise<CrawlLog | null> {
  const results = await mechStorage.query<CrawlLog>('crawl_logs', {
    where: { domain },
    orderBy: 'started_at',
    orderDir: 'DESC',
    limit: 1,
  });
  return results[0] || null;
}

/**
 * Create a crawl log entry
 */
export async function createCrawlLog(domain: string): Promise<CrawlLog> {
  const log: Omit<CrawlLog, 'id'> & { id: string } = {
    id: `crawl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    domain,
    started_at: new Date().toISOString(),
    completed_at: null,
    status: 'pending',
    error_message: null,
    endorsements_found: 0,
    notes_found: 0,
  };
  return mechStorage.insert('crawl_logs', log);
}

/**
 * Update a crawl log entry
 */
export async function updateCrawlLog(
  id: string,
  updates: Partial<Pick<CrawlLog, 'completed_at' | 'status' | 'error_message' | 'endorsements_found' | 'notes_found'>>
): Promise<CrawlLog> {
  return mechStorage.update('crawl_logs', id, updates);
}

/**
 * Get database statistics
 */
export async function getDatabaseStats(): Promise<{
  totalIdentities: number;
  totalEndorsements: number;
  totalNotes: number;
  totalBlacklisted: number;
}> {
  // Query each table and count results
  const [identities, endorsements, notes, blacklisted] = await Promise.all([
    mechStorage.query('identities', {}),
    mechStorage.query('endorsements', {}),
    mechStorage.query('notes', {}),
    mechStorage.query('blacklisted_domains', {}).catch(() => []),
  ]);

  return {
    totalIdentities: identities.length,
    totalEndorsements: endorsements.length,
    totalNotes: notes.length,
    totalBlacklisted: blacklisted.length,
  };
}

/**
 * List all domains with their stats
 */
export async function listDomains(options: {
  limit?: number;
  offset?: number;
  status?: 'success' | 'error' | 'pending';
} = {}): Promise<Array<Identity & { endorsement_count: number; note_count: number; last_status?: string }>> {
  const identities = await mechStorage.query<Identity>('identities', {
    orderBy: 'last_crawled',
    orderDir: 'DESC',
    limit: options.limit,
    offset: options.offset,
  });

  // Enrich with counts (could be optimized with aggregation queries)
  const enriched = await Promise.all(
    identities.map(async (identity) => {
      const endorsements = await mechStorage.query('endorsements', {
        where: { issuer: identity.did },
      });
      const notes = await mechStorage.query('notes', {
        where: { issuer: identity.did },
      });
      const latestLog = await getLatestCrawlLog(identity.domain || '');

      return {
        ...identity,
        endorsement_count: endorsements.length,
        note_count: notes.length,
        last_status: latestLog?.status,
      };
    })
  );

  // Filter by status if specified
  if (options.status) {
    return enriched.filter((d) => d.last_status === options.status);
  }

  return enriched;
}
