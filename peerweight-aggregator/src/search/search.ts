import { mechStorage } from '../services/mech-storage';
import type { Endorsement, Note } from '../core/db-helpers';

export interface SearchOptions {
  query?: string;
  category?: string;
  limit?: number;
  offset?: number;
}

export interface SearchResult<T> {
  results: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

/**
 * Search endorsements by text query and/or category
 * Uses PostgreSQL ILIKE for case-insensitive text matching
 */
export async function searchEndorsements(options: SearchOptions): Promise<SearchResult<Endorsement>> {
  const { query, category, limit = 20, offset = 0 } = options;

  // Get all endorsements (we'll filter in memory for now)
  // TODO: Use mech-storage's custom SQL query for server-side filtering
  let endorsements = await mechStorage.query<Endorsement>('endorsements', {
    orderBy: 'issued',
    orderDir: 'DESC',
  });

  // Filter by text query (search in claim and review fields)
  if (query) {
    const lowerQuery = query.toLowerCase();
    endorsements = endorsements.filter((e) => {
      const claim = (e.claim || '').toLowerCase();
      const review = (e.review || '').toLowerCase();
      return claim.includes(lowerQuery) || review.includes(lowerQuery);
    });
  }

  // Filter by category (supports hierarchical matching)
  if (category) {
    const lowerCategory = category.toLowerCase();
    endorsements = endorsements.filter((e) => {
      if (!e.categories) return false;
      // categories is stored as JSONB array
      const cats = Array.isArray(e.categories) ? e.categories : [];
      return cats.some((cat: string) => cat.toLowerCase().startsWith(lowerCategory));
    });
  }

  const total = endorsements.length;
  const paged = endorsements.slice(offset, offset + limit);

  return {
    results: paged,
    total,
    limit,
    offset,
    hasMore: offset + limit < total,
  };
}

/**
 * Search notes by text query
 */
export async function searchNotes(options: SearchOptions): Promise<SearchResult<Note>> {
  const { query, limit = 20, offset = 0 } = options;

  let notes = await mechStorage.query<Note>('notes', {
    orderBy: 'issued',
    orderDir: 'DESC',
  });

  // Filter by text query
  if (query) {
    const lowerQuery = query.toLowerCase();
    notes = notes.filter((n) => {
      const text = (n.text || '').toLowerCase();
      return text.includes(lowerQuery);
    });
  }

  const total = notes.length;
  const paged = notes.slice(offset, offset + limit);

  return {
    results: paged,
    total,
    limit,
    offset,
    hasMore: offset + limit < total,
  };
}

/**
 * Get unique categories from all endorsements
 */
export async function getCategories(): Promise<string[]> {
  const endorsements = await mechStorage.query<Endorsement>('endorsements', {});

  const categorySet = new Set<string>();
  for (const e of endorsements) {
    if (e.categories && Array.isArray(e.categories)) {
      for (const cat of e.categories) {
        categorySet.add(cat);
      }
    }
  }

  return Array.from(categorySet).sort();
}
