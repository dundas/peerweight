import { describe, it, expect, beforeAll } from 'bun:test';
import { mechStorage } from '../services/mech-storage';
import { searchEndorsements, searchNotes, getCategories } from './search';

describe('search module', () => {
  const testIssuer = `did:web:search-test-${Date.now()}.example.com`;
  const testEndorsementId = `search-endorsement-${Date.now()}`;
  const testNoteId = `search-note-${Date.now()}`;

  beforeAll(async () => {
    // Provision and create test data
    await mechStorage.provision();

    // Insert test endorsement
    await mechStorage.insert('endorsements', {
      id: testEndorsementId,
      issuer: testIssuer,
      subject_url: 'https://example.com/search-test-product',
      weight: 5,
      claim: 'This is an excellent kitchen knife for home cooking',
      review: 'After using this knife for months, I can confidently recommend it.',
      categories: ['commerce/kitchen/knives', 'home'],
    });

    // Insert test note
    await mechStorage.insert('notes', {
      id: testNoteId,
      issuer: testIssuer,
      subject_url: 'https://example.com/search-test-article',
      text: 'Great article about sustainable cooking practices',
      issued: new Date().toISOString(),
    });
  });

  describe('searchEndorsements', () => {
    it('should return all endorsements when no query', async () => {
      const result = await searchEndorsements({});
      expect(result.results).toBeDefined();
      expect(Array.isArray(result.results)).toBe(true);
      expect(result.total).toBeGreaterThanOrEqual(0);
    });

    it('should filter by text query in claim', async () => {
      const result = await searchEndorsements({ query: 'kitchen knife' });
      expect(result.results.length).toBeGreaterThanOrEqual(1);
      expect(result.results.some((e) => e.claim?.includes('kitchen knife'))).toBe(true);
    });

    it('should filter by text query in review', async () => {
      const result = await searchEndorsements({ query: 'confidently recommend' });
      expect(result.results.length).toBeGreaterThanOrEqual(1);
    });

    it('should filter by category', async () => {
      const result = await searchEndorsements({ category: 'commerce/kitchen' });
      expect(result.results.length).toBeGreaterThanOrEqual(1);
      // All results should have a category starting with commerce/kitchen
      for (const e of result.results) {
        const cats = Array.isArray(e.categories) ? e.categories : [];
        expect(cats.some((c: string) => c.startsWith('commerce/kitchen'))).toBe(true);
      }
    });

    it('should support pagination', async () => {
      const result = await searchEndorsements({ limit: 1, offset: 0 });
      expect(result.limit).toBe(1);
      expect(result.offset).toBe(0);
      expect(result.results.length).toBeLessThanOrEqual(1);
    });

    it('should indicate hasMore correctly', async () => {
      const allResults = await searchEndorsements({ limit: 1000 });
      if (allResults.total > 1) {
        const pagedResult = await searchEndorsements({ limit: 1 });
        expect(pagedResult.hasMore).toBe(true);
      }
    });
  });

  describe('searchNotes', () => {
    it('should return all notes when no query', async () => {
      const result = await searchNotes({});
      expect(result.results).toBeDefined();
      expect(Array.isArray(result.results)).toBe(true);
    });

    it('should filter by text query', async () => {
      const result = await searchNotes({ query: 'sustainable cooking' });
      expect(result.results.length).toBeGreaterThanOrEqual(1);
    });

    it('should support pagination', async () => {
      const result = await searchNotes({ limit: 5, offset: 0 });
      expect(result.limit).toBe(5);
      expect(result.results.length).toBeLessThanOrEqual(5);
    });
  });

  describe('getCategories', () => {
    it('should return unique categories', async () => {
      const categories = await getCategories();
      expect(Array.isArray(categories)).toBe(true);
      // Should include our test categories
      expect(categories.some((c) => c.includes('commerce'))).toBe(true);
    });

    it('should return sorted categories', async () => {
      const categories = await getCategories();
      const sorted = [...categories].sort();
      expect(categories).toEqual(sorted);
    });
  });
});
