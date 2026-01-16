import { test, expect, beforeEach, afterEach } from 'bun:test';
import { Database } from 'bun:sqlite';
import { unlinkSync } from 'fs';
import {
  getEndorsementsBySubject,
  getNotesBySubject,
  getEndorsementsByIssuer,
  getIdentityByDid,
  getIdentityByDomain,
  isBlacklisted,
  addToBlacklist,
  removeFromBlacklist,
  getCrawlLogsByDomain,
  getLatestCrawlLog,
  getEndorsementCount,
  getNoteCount,
  getDatabaseStats
} from './db-helpers';

const TEST_DB = 'test-db-helpers.sqlite';

let testDb: Database;

beforeEach(() => {
  // Clean up
  try {
    unlinkSync(TEST_DB);
  } catch {}

  // Create test database with schema
  testDb = new Database(TEST_DB);

  // Create tables
  testDb.run(`CREATE TABLE identities (did TEXT PRIMARY KEY, domain TEXT, public_key_multibase TEXT NOT NULL, created TEXT, updated TEXT, last_crawled TEXT);`);
  testDb.run(`CREATE TABLE endorsements (id TEXT PRIMARY KEY, issuer TEXT NOT NULL, subject_url TEXT, subject_id TEXT, weight INTEGER, disclosure TEXT, categories TEXT, claim TEXT, review TEXT, issued TEXT, proof_value TEXT);`);
  testDb.run(`CREATE TABLE notes (id TEXT PRIMARY KEY, issuer TEXT NOT NULL, subject_url TEXT, subject_id TEXT, reply_to TEXT, text TEXT, issued TEXT, proof_value TEXT);`);
  testDb.run(`CREATE TABLE blacklisted_domains (domain TEXT PRIMARY KEY, reason TEXT, blacklisted_at TEXT NOT NULL);`);
  testDb.run(`CREATE TABLE crawl_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, domain TEXT NOT NULL, started_at TEXT NOT NULL, completed_at TEXT, status TEXT NOT NULL, error_message TEXT, endorsements_found INTEGER DEFAULT 0, notes_found INTEGER DEFAULT 0);`);

  // Insert test data
  testDb.run(`INSERT INTO identities (did, domain, public_key_multibase, created) VALUES ('did:peerweight:test.com', 'test.com', 'z123abc', '2026-01-15T00:00:00Z')`);
  testDb.run(`INSERT INTO identities (did, domain, public_key_multibase, created) VALUES ('did:peerweight:example.com', 'example.com', 'z456def', '2026-01-14T00:00:00Z')`);

  testDb.run(`INSERT INTO endorsements (id, issuer, subject_url, weight, disclosure, categories, claim, issued, proof_value) VALUES ('urn:uuid:e1', 'did:peerweight:test.com', 'https://example.com/product', 5, 'editorial', '["commerce"]', 'Great product', '2026-01-15T10:00:00Z', 'proof1')`);
  testDb.run(`INSERT INTO endorsements (id, issuer, subject_url, weight, disclosure, categories, claim, issued, proof_value) VALUES ('urn:uuid:e2', 'did:peerweight:test.com', 'https://example.com/product', 4, 'purchased', '["commerce"]', 'Good quality', '2026-01-15T09:00:00Z', 'proof2')`);
  testDb.run(`INSERT INTO endorsements (id, issuer, subject_id, weight, disclosure, categories, claim, issued, proof_value) VALUES ('urn:uuid:e3', 'did:peerweight:example.com', 'did:peerweight:test.com', 5, 'editorial', '["profile"]', 'Trusted source', '2026-01-14T12:00:00Z', 'proof3')`);

  testDb.run(`INSERT INTO notes (id, issuer, subject_url, text, issued, proof_value) VALUES ('urn:uuid:n1', 'did:peerweight:test.com', 'https://example.com/article', 'Interesting article!', '2026-01-15T11:00:00Z', 'proof4')`);
  testDb.run(`INSERT INTO notes (id, issuer, subject_url, reply_to, text, issued, proof_value) VALUES ('urn:uuid:n2', 'did:peerweight:example.com', 'https://example.com/article', 'urn:uuid:n1', 'I agree!', '2026-01-15T12:00:00Z', 'proof5')`);
});

afterEach(() => {
  testDb.close();
  try {
    unlinkSync(TEST_DB);
  } catch {}
});

test('getEndorsementsBySubject returns endorsements for URL', () => {
  const endorsements = getEndorsementsBySubject('https://example.com/product', testDb);

  expect(endorsements.length).toBe(2);
  expect(endorsements[0].id).toBe('urn:uuid:e1'); // Newest first
  expect(endorsements[1].id).toBe('urn:uuid:e2');
});

test('getEndorsementsBySubject returns endorsements for DID', () => {
  const endorsements = getEndorsementsBySubject('did:peerweight:test.com', testDb);

  expect(endorsements.length).toBe(1);
  expect(endorsements[0].id).toBe('urn:uuid:e3');
});

test('getEndorsementsBySubject returns empty array for unknown subject', () => {
  const endorsements = getEndorsementsBySubject('https://unknown.com', testDb);

  expect(endorsements.length).toBe(0);
});

test('getNotesBySubject returns notes ordered by issued ASC', () => {
  const notes = getNotesBySubject('https://example.com/article', testDb);

  expect(notes.length).toBe(2);
  expect(notes[0].id).toBe('urn:uuid:n1'); // Oldest first
  expect(notes[1].id).toBe('urn:uuid:n2');
});

test('getEndorsementsByIssuer returns all endorsements from a DID', () => {
  const endorsements = getEndorsementsByIssuer('did:peerweight:test.com', testDb);

  expect(endorsements.length).toBe(2);
  expect(endorsements[0].subject_url).toBe('https://example.com/product');
});

test('getIdentityByDid returns identity', () => {
  const identity = getIdentityByDid('did:peerweight:test.com', testDb);

  expect(identity).not.toBeNull();
  expect(identity!.domain).toBe('test.com');
  expect(identity!.public_key_multibase).toBe('z123abc');
});

test('getIdentityByDomain returns identity', () => {
  const identity = getIdentityByDomain('example.com', testDb);

  expect(identity).not.toBeNull();
  expect(identity!.did).toBe('did:peerweight:example.com');
});

test('isBlacklisted returns false for non-blacklisted domain', () => {
  expect(isBlacklisted('test.com', testDb)).toBe(false);
});

test('addToBlacklist and isBlacklisted work together', () => {
  addToBlacklist('spam.com', 'Spam domain', testDb);

  expect(isBlacklisted('spam.com', testDb)).toBe(true);
});

test('removeFromBlacklist removes domain', () => {
  addToBlacklist('spam.com', 'Spam domain', testDb);
  expect(isBlacklisted('spam.com', testDb)).toBe(true);

  removeFromBlacklist('spam.com', testDb);
  expect(isBlacklisted('spam.com', testDb)).toBe(false);
});

test('getCrawlLogsByDomain returns logs', () => {
  testDb.run(`INSERT INTO crawl_logs (domain, started_at, status) VALUES ('test.com', '2026-01-15T10:00:00Z', 'success')`);
  testDb.run(`INSERT INTO crawl_logs (domain, started_at, status) VALUES ('test.com', '2026-01-14T10:00:00Z', 'error')`);

  const logs = getCrawlLogsByDomain('test.com', 10, testDb);

  expect(logs.length).toBe(2);
  expect(logs[0].status).toBe('success'); // Newest first
  expect(logs[1].status).toBe('error');
});

test('getLatestCrawlLog returns most recent log', () => {
  testDb.run(`INSERT INTO crawl_logs (domain, started_at, status) VALUES ('test.com', '2026-01-15T10:00:00Z', 'success')`);
  testDb.run(`INSERT INTO crawl_logs (domain, started_at, status) VALUES ('test.com', '2026-01-14T10:00:00Z', 'error')`);

  const log = getLatestCrawlLog('test.com', testDb);

  expect(log).not.toBeNull();
  expect(log!.status).toBe('success');
});

test('getEndorsementCount returns correct count', () => {
  const count = getEndorsementCount('https://example.com/product', testDb);

  expect(count).toBe(2);
});

test('getNoteCount returns correct count', () => {
  const count = getNoteCount('https://example.com/article', testDb);

  expect(count).toBe(2);
});

test('getDatabaseStats returns all counts', () => {
  const stats = getDatabaseStats(testDb);

  expect(stats.totalIdentities).toBe(2);
  expect(stats.totalEndorsements).toBe(3);
  expect(stats.totalNotes).toBe(2);
  expect(stats.totalBlacklisted).toBe(0);
});

test('getDatabaseStats includes blacklisted count', () => {
  addToBlacklist('spam1.com', null, testDb);
  addToBlacklist('spam2.com', null, testDb);

  const stats = getDatabaseStats(testDb);

  expect(stats.totalBlacklisted).toBe(2);
});
