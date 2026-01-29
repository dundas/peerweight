import { db } from './core/db';
import { verifyObject } from './core/crypto';
import { EndorsementSchema, NoteSchema } from './core/models';
import { mechStorage } from './services/mech-storage';
import {
  createCrawlLog,
  updateCrawlLog,
  isBlacklisted,
  type CrawlLog,
} from './core/db-helpers';
import { z } from 'zod';

// Configuration
const DEFAULT_RETRY_COUNT = 3;
const DEFAULT_RETRY_DELAY_MS = 1000;
const DEFAULT_TIMEOUT_MS = 30000;

// Minimal schema for did.json fetching
const DIDDocumentSchema = z.object({
  id: z.string().optional(), // standard DID doc field, sometimes 'id', sometimes 'did' in our loose spec example
  did: z.string().optional(), // PeerWeight spec example uses 'did'
  publicKey: z.object({
    id: z.string(),
    type: z.literal('Ed25519VerificationKey2020'),
    publicKeyMultibase: z.string(),
  }),
});

// Schema for revocations.json
const RevocationSchema = z.object({
  id: z.string(),
  type: z.enum(['endorsement', 'note']),
  revokedAt: z.string().optional(),
  reason: z.string().optional(),
});

interface CrawlOptions {
  retryCount?: number;
  retryDelayMs?: number;
  timeoutMs?: number;
  skipLogging?: boolean;
}

interface CrawlResult {
  success: boolean;
  domain: string;
  did: string | null;
  endorsementsProcessed: number;
  notesProcessed: number;
  revocationsProcessed: number;
  error: string | null;
  crawlLogId: string | null;
}

/**
 * Fetch with retry and exponential backoff
 */
async function fetchWithRetry(
  url: string,
  options: {
    retryCount?: number;
    retryDelayMs?: number;
    timeoutMs?: number;
  } = {}
): Promise<Response> {
  const { retryCount = DEFAULT_RETRY_COUNT, retryDelayMs = DEFAULT_RETRY_DELAY_MS, timeoutMs = DEFAULT_TIMEOUT_MS } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < retryCount; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      // Don't retry on 4xx errors (client errors)
      if (response.status >= 400 && response.status < 500) {
        return response;
      }

      // Retry on 5xx errors
      if (response.status >= 500) {
        lastError = new Error(`HTTP ${response.status}`);
        if (attempt < retryCount - 1) {
          const delay = retryDelayMs * Math.pow(2, attempt);
          console.log(`[Crawler] Retry ${attempt + 1}/${retryCount} for ${url} after ${delay}ms`);
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
      }

      return response;
    } catch (err: any) {
      lastError = err;

      // Don't retry on abort (timeout)
      if (err.name === 'AbortError') {
        throw new Error(`Request timeout after ${timeoutMs}ms`);
      }

      // Retry on network errors
      if (attempt < retryCount - 1) {
        const delay = retryDelayMs * Math.pow(2, attempt);
        console.log(`[Crawler] Retry ${attempt + 1}/${retryCount} for ${url} after ${delay}ms (${err.message})`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error('Unknown fetch error');
}

/**
 * Crawl a domain for PeerWeight data
 */
export async function crawlDomain(domain: string, options: CrawlOptions = {}): Promise<CrawlResult> {
  const { skipLogging = false } = options;

  const result: CrawlResult = {
    success: false,
    domain,
    did: null,
    endorsementsProcessed: 0,
    notesProcessed: 0,
    revocationsProcessed: 0,
    error: null,
    crawlLogId: null,
  };

  // Check blacklist
  try {
    const blacklisted = await isBlacklisted(domain);
    if (blacklisted) {
      result.error = 'Domain is blacklisted';
      console.log(`[Crawler] Skipping blacklisted domain: ${domain}`);
      return result;
    }
  } catch (err) {
    // Continue if blacklist check fails
    console.warn(`[Crawler] Blacklist check failed for ${domain}, continuing...`);
  }

  // Create crawl log
  let crawlLog: CrawlLog | null = null;
  if (!skipLogging) {
    try {
      crawlLog = await createCrawlLog(domain);
      result.crawlLogId = crawlLog.id;
    } catch (err) {
      console.warn(`[Crawler] Failed to create crawl log for ${domain}:`, err);
    }
  }

  console.log(`[Crawler] Starting crawl for: ${domain}`);
  const protocol = 'https://';
  const baseUrl = `${protocol}${domain}/.well-known/peerweight`;

  // 1. Fetch Identity (DID)
  let publicKeyMultibase = '';
  let did = '';

  try {
    const didUrl = `${baseUrl}/did.json`;
    console.log(`[Crawler] Fetching Identity: ${didUrl}`);
    const res = await fetchWithRetry(didUrl, options);

    if (!res.ok) {
      throw new Error(`Failed to fetch did.json: ${res.status}`);
    }

    const json = await res.json();
    const doc = DIDDocumentSchema.parse(json);

    // Support both standard 'id' and our example 'did'
    did = doc.did || doc.id || '';
    if (!did) throw new Error('DID document missing "did" or "id" field');

    publicKeyMultibase = doc.publicKey.publicKeyMultibase;
    result.did = did;

    // Upsert Identity
    await db.identities.upsert({
      did,
      domain,
      public_key_multibase: publicKeyMultibase,
      last_crawled: new Date().toISOString(),
    });

    console.log(`[Crawler] Identity verified: ${did}`);
  } catch (err: any) {
    result.error = `Identity fetch failed: ${err.message}`;
    console.error(`[Crawler] Identity fetch failed for ${domain}:`, err);

    // Update crawl log with error
    if (crawlLog) {
      try {
        await updateCrawlLog(crawlLog.id, {
          completed_at: new Date().toISOString(),
          status: 'error',
          error_message: result.error,
        });
      } catch (e) {
        console.warn(`[Crawler] Failed to update crawl log:`, e);
      }
    }

    return result;
  }

  // 2. Fetch and process revocations first
  try {
    const revUrl = `${baseUrl}/revocations.json`;
    console.log(`[Crawler] Fetching Revocations: ${revUrl}`);
    const res = await fetchWithRetry(revUrl, options);

    if (res.ok) {
      const revocations = await res.json();
      if (Array.isArray(revocations)) {
        for (const item of revocations) {
          const parsed = RevocationSchema.safeParse(item);
          if (!parsed.success) {
            console.warn(`[Crawler] Invalid revocation schema:`, parsed.error);
            continue;
          }

          const rev = parsed.data;

          // Mark item as revoked
          try {
            await mechStorage.insert('revoked_items', {
              id: rev.id,
              item_type: rev.type,
              revoked_at: rev.revokedAt || new Date().toISOString(),
              reason: rev.reason || null,
            });
            result.revocationsProcessed++;
          } catch (err: any) {
            // Ignore duplicate key errors
            if (!err.message?.includes('already exists') && !err.message?.includes('duplicate')) {
              console.warn(`[Crawler] Failed to record revocation ${rev.id}:`, err);
            }
          }
        }
        console.log(`[Crawler] Processed ${result.revocationsProcessed} revocations.`);
      }
    } else if (res.status !== 404) {
      console.warn(`[Crawler] Failed to fetch revocations: ${res.status}`);
    }
  } catch (err) {
    // Revocations file is optional, continue on error
    console.log(`[Crawler] No revocations found (${err})`);
  }

  // Helper to check if an item is revoked
  const revokedIds = new Set<string>();
  try {
    const revoked = await mechStorage.query<{ id: string }>('revoked_items', {});
    for (const r of revoked) {
      revokedIds.add(r.id);
    }
  } catch (err) {
    console.warn(`[Crawler] Failed to load revoked items:`, err);
  }

  // 3. Fetch Endorsements
  try {
    const endUrl = `${baseUrl}/endorsements.json`;
    console.log(`[Crawler] Fetching Endorsements: ${endUrl}`);
    const res = await fetchWithRetry(endUrl, options);

    if (res.ok) {
      const collection = await res.json();
      if (Array.isArray(collection)) {
        for (const item of collection) {
          // Skip revoked items
          if (item.id && revokedIds.has(item.id)) {
            console.log(`[Crawler] Skipping revoked endorsement: ${item.id}`);
            continue;
          }

          // Verify Signature
          if (!verifyObject(item, publicKeyMultibase)) {
            console.warn(`[Crawler] Invalid signature for endorsement ${item.id}`);
            continue;
          }

          // Verify Schema
          const parsed = EndorsementSchema.safeParse(item);
          if (!parsed.success) {
            console.warn(`[Crawler] Invalid schema for endorsement ${item.id}`, parsed.error);
            continue;
          }

          const end = parsed.data;

          // Check if already exists (skip duplicates)
          const exists = await db.endorsements.exists(end.id);
          if (exists) continue;

          // Insert Endorsement
          await db.endorsements.insert({
            id: end.id,
            issuer: end.issuer,
            subject_url: end.subject.url || undefined,
            subject_id: end.subject.id || undefined,
            weight: end.weight,
            disclosure: end.disclosure,
            categories: end.categories,
            claim: end.claim || undefined,
            issued: end.issued,
            proof_value: end.proof?.proofValue || undefined,
          });
          result.endorsementsProcessed++;
        }
        console.log(`[Crawler] Processed ${result.endorsementsProcessed} endorsements.`);
      }
    } else if (res.status !== 404) {
      console.warn(`[Crawler] Failed to fetch endorsements: ${res.status}`);
    }
  } catch (err) {
    console.error(`[Crawler] Endorsement crawl error:`, err);
  }

  // 4. Fetch Notes (JSONL)
  try {
    const notesUrl = `${baseUrl}/notes.jsonl`;
    console.log(`[Crawler] Fetching Notes: ${notesUrl}`);
    const res = await fetchWithRetry(notesUrl, options);

    if (res.ok) {
      const text = await res.text();
      const lines = text.split('\n');

      for (const line of lines) {
        if (!line.trim()) continue;

        try {
          const item = JSON.parse(line);

          // Skip revoked items
          if (item.id && revokedIds.has(item.id)) {
            console.log(`[Crawler] Skipping revoked note: ${item.id}`);
            continue;
          }

          if (!verifyObject(item, publicKeyMultibase)) continue;

          const parsed = NoteSchema.safeParse(item);
          if (!parsed.success) continue;

          const note = parsed.data;

          // Check if already exists (skip duplicates)
          const exists = await db.notes.exists(note.id);
          if (exists) continue;

          await db.notes.insert({
            id: note.id,
            issuer: note.issuer,
            subject_url: note.subject?.url || undefined,
            subject_id: note.subject?.id || undefined,
            reply_to: note.replyTo || undefined,
            text: note.text,
            issued: note.issued,
            proof_value: note.proof?.proofValue || undefined,
          });
          result.notesProcessed++;
        } catch (e) {
          // Skip malformed lines
        }
      }
      console.log(`[Crawler] Processed ${result.notesProcessed} notes.`);
    }
  } catch (err) {
    console.error(`[Crawler] Note crawl error:`, err);
  }

  // Update crawl log with success
  result.success = true;
  if (crawlLog) {
    try {
      await updateCrawlLog(crawlLog.id, {
        completed_at: new Date().toISOString(),
        status: 'success',
        endorsements_found: result.endorsementsProcessed,
        notes_found: result.notesProcessed,
      });
    } catch (e) {
      console.warn(`[Crawler] Failed to update crawl log:`, e);
    }
  }

  console.log(`[Crawler] Completed crawl for ${domain}: ${result.endorsementsProcessed} endorsements, ${result.notesProcessed} notes`);
  return result;
}

/**
 * Crawl multiple domains in sequence with rate limiting
 */
export async function crawlDomains(
  domains: string[],
  options: CrawlOptions & { delayBetweenMs?: number } = {}
): Promise<CrawlResult[]> {
  const { delayBetweenMs = 1000, ...crawlOptions } = options;
  const results: CrawlResult[] = [];

  for (const domain of domains) {
    const result = await crawlDomain(domain, crawlOptions);
    results.push(result);

    // Rate limit between domains
    if (delayBetweenMs > 0 && domains.indexOf(domain) < domains.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayBetweenMs));
    }
  }

  return results;
}

/**
 * Get domains that need crawling (haven't been crawled recently)
 */
export async function getDomainsNeedingCrawl(maxAgeDays: number = 1): Promise<string[]> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - maxAgeDays);
  const cutoffStr = cutoff.toISOString();

  // Get all identities
  const identities = await mechStorage.queryAll<{ did: string; domain: string | null; last_crawled: string | null }>('identities');

  // Filter to those needing crawl
  const needsCrawl = identities.filter((i) => {
    if (!i.domain) return false;
    if (!i.last_crawled) return true;
    return i.last_crawled < cutoffStr;
  });

  return needsCrawl.map((i) => i.domain!);
}

/**
 * Schedule periodic crawling of all known domains
 */
export function startCrawlScheduler(intervalHours: number = 24): { stop: () => void } {
  console.log(`[Crawler] Starting scheduled crawling every ${intervalHours} hours`);

  const runScheduledCrawl = async () => {
    console.log(`[Crawler] Running scheduled crawl...`);
    try {
      const domains = await getDomainsNeedingCrawl(intervalHours / 24);
      console.log(`[Crawler] Found ${domains.length} domains needing crawl`);

      if (domains.length > 0) {
        await crawlDomains(domains, { delayBetweenMs: 2000 });
      }
    } catch (err) {
      console.error(`[Crawler] Scheduled crawl error:`, err);
    }
  };

  // Run immediately
  runScheduledCrawl();

  // Then run periodically
  const intervalId = setInterval(runScheduledCrawl, intervalHours * 60 * 60 * 1000);

  return {
    stop: () => {
      console.log(`[Crawler] Stopping scheduled crawling`);
      clearInterval(intervalId);
    },
  };
}
