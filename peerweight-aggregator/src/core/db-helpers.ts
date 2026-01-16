import type { Database } from 'bun:sqlite';
import { db } from './db';

/**
 * Type-safe query helpers for common database operations
 */

export interface Endorsement {
  id: string;
  issuer: string;
  subject_url: string | null;
  subject_id: string | null;
  weight: number;
  disclosure: string;
  categories: string; // JSON array
  claim: string | null;
  review: string | null;
  issued: string;
  proof_value: string | null;
}

export interface Note {
  id: string;
  issuer: string;
  subject_url: string | null;
  subject_id: string | null;
  reply_to: string | null;
  text: string;
  issued: string;
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
  id: number;
  domain: string;
  started_at: string;
  completed_at: string | null;
  status: 'pending' | 'success' | 'error';
  error_message: string | null;
  endorsements_found: number;
  notes_found: number;
}

/**
 * Get all endorsements for a given subject (URL or DID)
 */
export function getEndorsementsBySubject(subject: string, database: Database = db): Endorsement[] {
  const results = database.query(`
    SELECT * FROM endorsements
    WHERE subject_url = $subject OR subject_id = $subject
    ORDER BY issued DESC
  `).all({ $subject: subject });

  return results as Endorsement[];
}

/**
 * Get all notes for a given subject (URL or DID)
 */
export function getNotesBySubject(subject: string, database: Database = db): Note[] {
  const results = database.query(`
    SELECT * FROM notes
    WHERE subject_url = $subject OR subject_id = $subject
    ORDER BY issued ASC
  `).all({ $subject: subject });

  return results as Note[];
}

/**
 * Get all endorsements issued by a specific DID
 */
export function getEndorsementsByIssuer(issuer: string, database: Database = db): Endorsement[] {
  const results = database.query(`
    SELECT * FROM endorsements
    WHERE issuer = $issuer
    ORDER BY issued DESC
  `).all({ $issuer: issuer });

  return results as Endorsement[];
}

/**
 * Get identity by DID
 */
export function getIdentityByDid(did: string, database: Database = db): Identity | null {
  const result = database.query('SELECT * FROM identities WHERE did = $did').get({ $did: did });
  return result as Identity | null;
}

/**
 * Get identity by domain
 */
export function getIdentityByDomain(domain: string, database: Database = db): Identity | null {
  const result = database.query('SELECT * FROM identities WHERE domain = $domain').get({ $domain: domain });
  return result as Identity | null;
}

/**
 * Check if a domain is blacklisted
 */
export function isBlacklisted(domain: string, database: Database = db): boolean {
  const result = database.query('SELECT domain FROM blacklisted_domains WHERE domain = $domain').get({ $domain: domain });
  return result !== null;
}

/**
 * Add a domain to the blacklist
 */
export function addToBlacklist(domain: string, reason: string | null = null, database: Database = db): void {
  database.run(
    'INSERT OR REPLACE INTO blacklisted_domains (domain, reason, blacklisted_at) VALUES ($domain, $reason, $now)',
    {
      $domain: domain,
      $reason: reason,
      $now: new Date().toISOString()
    }
  );
}

/**
 * Remove a domain from the blacklist
 */
export function removeFromBlacklist(domain: string, database: Database = db): void {
  database.run('DELETE FROM blacklisted_domains WHERE domain = $domain', { $domain: domain });
}

/**
 * Get recent crawl logs for a domain
 */
export function getCrawlLogsByDomain(domain: string, limit: number = 10, database: Database = db): CrawlLog[] {
  const results = database.query(`
    SELECT * FROM crawl_logs
    WHERE domain = $domain
    ORDER BY started_at DESC
    LIMIT $limit
  `).all({ $domain: domain, $limit: limit });

  return results as CrawlLog[];
}

/**
 * Get the most recent crawl log for a domain
 */
export function getLatestCrawlLog(domain: string, database: Database = db): CrawlLog | null {
  const result = database.query(`
    SELECT * FROM crawl_logs
    WHERE domain = $domain
    ORDER BY started_at DESC
    LIMIT 1
  `).get({ $domain: domain });

  return result as CrawlLog | null;
}

/**
 * Get count of endorsements for a subject
 */
export function getEndorsementCount(subject: string, database: Database = db): number {
  const result = database.query(`
    SELECT COUNT(*) as count FROM endorsements
    WHERE subject_url = $subject OR subject_id = $subject
  `).get({ $subject: subject }) as any;

  return result.count;
}

/**
 * Get count of notes for a subject
 */
export function getNoteCount(subject: string, database: Database = db): number {
  const result = database.query(`
    SELECT COUNT(*) as count FROM notes
    WHERE subject_url = $subject OR subject_id = $subject
  `).get({ $subject: subject }) as any;

  return result.count;
}

/**
 * Get total counts for statistics
 */
export function getDatabaseStats(database: Database = db) {
  const identities = database.query('SELECT COUNT(*) as count FROM identities').get() as any;
  const endorsements = database.query('SELECT COUNT(*) as count FROM endorsements').get() as any;
  const notes = database.query('SELECT COUNT(*) as count FROM notes').get() as any;
  const blacklisted = database.query('SELECT COUNT(*) as count FROM blacklisted_domains').get() as any;

  return {
    totalIdentities: identities.count,
    totalEndorsements: endorsements.count,
    totalNotes: notes.count,
    totalBlacklisted: blacklisted.count
  };
}
