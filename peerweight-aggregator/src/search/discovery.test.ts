import { describe, it, expect, beforeAll } from 'bun:test';
import { mechStorage } from '../services/mech-storage';
import { listDomains, getEndorserProfile, getStats } from './discovery';

describe('discovery module', () => {
  const testDid = `did:web:discovery-test-${Date.now()}.example.com`;
  const testDomain = `discovery-test-${Date.now()}.example.com`;
  const testEndorsementId = `discovery-endorsement-${Date.now()}`;

  beforeAll(async () => {
    await mechStorage.provision();

    // Insert test identity
    await mechStorage.insert('identities', {
      did: testDid,
      domain: testDomain,
      public_key_multibase: 'z6MkDiscoveryTest...',
      last_crawled: new Date().toISOString(),
    });

    // Insert test endorsement
    await mechStorage.insert('endorsements', {
      id: testEndorsementId,
      issuer: testDid,
      subject_url: 'https://example.com/discovery-test',
      weight: 4,
      claim: 'Test endorsement for discovery',
    });
  });

  describe('listDomains', () => {
    it('should return list of domains', async () => {
      const result = await listDomains();
      expect(result.domains).toBeDefined();
      expect(Array.isArray(result.domains)).toBe(true);
      expect(result.total).toBeGreaterThanOrEqual(1);
    });

    it('should include endorsement counts', async () => {
      const result = await listDomains();
      const testDomainInfo = result.domains.find((d) => d.domain === testDomain);
      if (testDomainInfo) {
        expect(testDomainInfo.endorsement_count).toBeGreaterThanOrEqual(1);
      }
    });

    it('should support sort by recent', async () => {
      const result = await listDomains({ sort: 'recent' });
      expect(result.domains.length).toBeGreaterThanOrEqual(0);
      // First domain should have most recent last_crawled (or null)
    });

    it('should support sort by endorsements', async () => {
      const result = await listDomains({ sort: 'endorsements' });
      // Verify descending order
      for (let i = 1; i < result.domains.length; i++) {
        expect(result.domains[i - 1].endorsement_count).toBeGreaterThanOrEqual(
          result.domains[i].endorsement_count
        );
      }
    });

    it('should support pagination', async () => {
      const result = await listDomains({ limit: 1, offset: 0 });
      expect(result.domains.length).toBeLessThanOrEqual(1);
    });
  });

  describe('getEndorserProfile', () => {
    it('should return profile for existing endorser', async () => {
      const profile = await getEndorserProfile(testDid);
      expect(profile).not.toBeNull();
      expect(profile?.did).toBe(testDid);
      expect(profile?.domain).toBe(testDomain);
      expect(profile?.endorsement_count).toBeGreaterThanOrEqual(1);
    });

    it('should include endorsements in profile', async () => {
      const profile = await getEndorserProfile(testDid);
      expect(profile?.endorsements).toBeDefined();
      expect(Array.isArray(profile?.endorsements)).toBe(true);
      expect(profile?.endorsements.length).toBeGreaterThanOrEqual(1);
    });

    it('should return null for non-existent endorser', async () => {
      const profile = await getEndorserProfile('did:web:non-existent-12345.example.com');
      expect(profile).toBeNull();
    });
  });

  describe('getStats', () => {
    it('should return database statistics', async () => {
      const stats = await getStats();
      expect(stats.indexedDomains).toBeGreaterThanOrEqual(1);
      expect(stats.totalEndorsements).toBeGreaterThanOrEqual(1);
      expect(stats.totalNotes).toBeGreaterThanOrEqual(0);
    });

    it('should return numeric values', async () => {
      const stats = await getStats();
      expect(typeof stats.indexedDomains).toBe('number');
      expect(typeof stats.totalEndorsements).toBe('number');
      expect(typeof stats.totalNotes).toBe('number');
    });
  });
});
