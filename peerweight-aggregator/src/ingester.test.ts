import { describe, it, expect, beforeAll, mock, spyOn } from 'bun:test';
import { mechStorage } from './services/mech-storage';

// We'll test the retry logic and helper functions
// Actual crawling requires network access to real domains

describe('ingester module', () => {
  beforeAll(async () => {
    await mechStorage.provision();
  });

  describe('fetchWithRetry', () => {
    it('should be implemented in the module', async () => {
      // Import the module to verify it loads correctly
      const ingester = await import('./ingester');
      expect(ingester.crawlDomain).toBeDefined();
      expect(ingester.crawlDomains).toBeDefined();
      expect(ingester.getDomainsNeedingCrawl).toBeDefined();
      expect(ingester.startCrawlScheduler).toBeDefined();
    });
  });

  describe('getDomainsNeedingCrawl', () => {
    const testDomain = `crawl-test-${Date.now()}.example.com`;
    const testDid = `did:web:${testDomain}`;

    beforeAll(async () => {
      // Insert a test identity with old last_crawled date
      await mechStorage.insert('identities', {
        did: testDid,
        domain: testDomain,
        public_key_multibase: 'z6MkTest...',
        last_crawled: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(), // 48 hours ago
      });
    });

    it('should return domains that need crawling', async () => {
      const { getDomainsNeedingCrawl } = await import('./ingester');
      const domains = await getDomainsNeedingCrawl(1); // max age 1 day
      expect(Array.isArray(domains)).toBe(true);
      // Our test domain should be in the list (it's 48 hours old)
      expect(domains.includes(testDomain)).toBe(true);
    });

    it('should not return recently crawled domains', async () => {
      const recentDomain = `recent-crawl-${Date.now()}.example.com`;
      const recentDid = `did:web:${recentDomain}`;

      // Insert a recently crawled identity
      await mechStorage.insert('identities', {
        did: recentDid,
        domain: recentDomain,
        public_key_multibase: 'z6MkTest...',
        last_crawled: new Date().toISOString(), // just now
      });

      const { getDomainsNeedingCrawl } = await import('./ingester');
      const domains = await getDomainsNeedingCrawl(1);
      expect(domains.includes(recentDomain)).toBe(false);
    });
  });

  describe('crawlDomain', () => {
    it('should return error for blacklisted domain', async () => {
      const blacklistedDomain = `blacklisted-${Date.now()}.example.com`;

      // Add to blacklist
      await mechStorage.insert('blacklisted_domains', {
        domain: blacklistedDomain,
        reason: 'Test blacklist',
        blacklisted_at: new Date().toISOString(),
      });

      const { crawlDomain } = await import('./ingester');
      const result = await crawlDomain(blacklistedDomain, { skipLogging: true });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Domain is blacklisted');
    });

    it('should return error for non-existent domain', async () => {
      const { crawlDomain } = await import('./ingester');
      const result = await crawlDomain('non-existent-domain-12345.invalid', {
        skipLogging: true,
        retryCount: 1,
        timeoutMs: 5000,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });

    it('should create crawl result with expected fields', async () => {
      const { crawlDomain } = await import('./ingester');
      const result = await crawlDomain('test.invalid', {
        skipLogging: true,
        retryCount: 1,
        timeoutMs: 5000,
      });

      // Verify result structure
      expect(result.domain).toBe('test.invalid');
      expect(typeof result.success).toBe('boolean');
      expect(typeof result.endorsementsProcessed).toBe('number');
      expect(typeof result.notesProcessed).toBe('number');
      expect(typeof result.revocationsProcessed).toBe('number');
    });
  });

  describe('crawlDomains', () => {
    it('should crawl multiple domains sequentially', async () => {
      const { crawlDomains } = await import('./ingester');
      const results = await crawlDomains(
        ['test1.invalid', 'test2.invalid'],
        {
          skipLogging: true,
          retryCount: 1,
          timeoutMs: 5000,
          delayBetweenMs: 100,
        }
      );

      expect(results.length).toBe(2);
      expect(results[0].domain).toBe('test1.invalid');
      expect(results[1].domain).toBe('test2.invalid');
    });
  });

  describe('startCrawlScheduler', () => {
    it('should return stop function', async () => {
      const { startCrawlScheduler } = await import('./ingester');

      // Start scheduler with interval that fits in 32-bit signed int (max ~596 hours)
      const scheduler = startCrawlScheduler(100);

      expect(scheduler.stop).toBeDefined();
      expect(typeof scheduler.stop).toBe('function');

      // Stop it immediately
      scheduler.stop();
    });
  });
});
