import { mechStorage } from '../services/mech-storage';
import type { Identity, Endorsement, Note, CrawlLog } from '../core/db-helpers';

export interface DomainInfo {
  domain: string;
  did: string;
  last_crawled: string | null;
  status: 'success' | 'error' | 'pending' | 'unknown';
  endorsement_count: number;
  note_count: number;
}

export interface EndorserProfile {
  did: string;
  domain: string | null;
  public_key_multibase: string;
  endorsement_count: number;
  endorsements: Endorsement[];
}

export interface ListDomainsOptions {
  sort?: 'recent' | 'endorsements' | 'domain';
  status?: 'success' | 'error' | 'pending';
  limit?: number;
  offset?: number;
}

/**
 * List all indexed domains with metadata
 */
export async function listDomains(options: ListDomainsOptions = {}): Promise<{
  domains: DomainInfo[];
  total: number;
}> {
  const { sort = 'recent', status, limit = 50, offset = 0 } = options;

  // Get all identities (use queryAll for tables with non-id primary keys)
  const identities = await mechStorage.queryAll<Identity>('identities');

  // Enrich with counts and status
  const enriched = await Promise.all(
    identities.map(async (identity) => {
      const endorsements = await mechStorage.query<Endorsement>('endorsements', {
        where: { issuer: identity.did },
      });
      const notes = await mechStorage.query<Note>('notes', {
        where: { issuer: identity.did },
      });

      // Get latest crawl status
      let crawlStatus: 'success' | 'error' | 'pending' | 'unknown' = 'unknown';
      if (identity.domain) {
        const logs = await mechStorage.query<CrawlLog>('crawl_logs', {
          where: { domain: identity.domain },
          orderBy: 'started_at',
          orderDir: 'DESC',
          limit: 1,
        });
        if (logs.length > 0) {
          crawlStatus = logs[0].status as 'success' | 'error' | 'pending';
        }
      }

      return {
        domain: identity.domain || identity.did,
        did: identity.did,
        last_crawled: identity.last_crawled,
        status: crawlStatus,
        endorsement_count: endorsements.length,
        note_count: notes.length,
      };
    })
  );

  // Filter by status if specified
  let filtered = status ? enriched.filter((d) => d.status === status) : enriched;

  // Sort
  if (sort === 'recent') {
    filtered.sort((a, b) => {
      const dateA = a.last_crawled ? new Date(a.last_crawled).getTime() : 0;
      const dateB = b.last_crawled ? new Date(b.last_crawled).getTime() : 0;
      return dateB - dateA;
    });
  } else if (sort === 'endorsements') {
    filtered.sort((a, b) => b.endorsement_count - a.endorsement_count);
  } else if (sort === 'domain') {
    filtered.sort((a, b) => a.domain.localeCompare(b.domain));
  }

  const total = filtered.length;
  const paged = filtered.slice(offset, offset + limit);

  return { domains: paged, total };
}

/**
 * Get endorser profile by DID
 */
export async function getEndorserProfile(did: string): Promise<EndorserProfile | null> {
  // Get identity using raw SQL (identities table has non-id primary key)
  const allIdentities = await mechStorage.queryAll<Identity>('identities');
  const identity = allIdentities.find((i) => i.did === did);

  if (!identity) {
    return null;
  }

  // Get all endorsements by this issuer
  const endorsements = await mechStorage.query<Endorsement>('endorsements', {
    where: { issuer: did },
    orderBy: 'issued',
    orderDir: 'DESC',
  });

  return {
    did: identity.did,
    domain: identity.domain,
    public_key_multibase: identity.public_key_multibase,
    endorsement_count: endorsements.length,
    endorsements,
  };
}

/**
 * Get database statistics for health endpoint
 */
export async function getStats(): Promise<{
  indexedDomains: number;
  totalEndorsements: number;
  totalNotes: number;
}> {
  // Use queryAll for identities (non-id primary key table)
  const [identities, endorsements, notes] = await Promise.all([
    mechStorage.queryAll<Identity>('identities'),
    mechStorage.query('endorsements', {}),
    mechStorage.query('notes', {}),
  ]);

  return {
    indexedDomains: identities.length,
    totalEndorsements: endorsements.length,
    totalNotes: notes.length,
  };
}
