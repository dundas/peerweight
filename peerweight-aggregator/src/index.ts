import { Elysia, t } from 'elysia';
import { db, initDB } from './core/db';
import { crawlDomain } from './ingester';
import { searchEndorsements, searchNotes, getCategories } from './search/search';
import { listDomains, getEndorserProfile, getStats } from './search/discovery';
import {
  checkRateLimit,
  createRateLimitHeaders,
  createTooManyRequestsResponse,
  RateLimitPresets,
} from './middleware/rate-limiter';
import { requireAdmin, authenticate } from './middleware/auth';
import { addToBlacklist, removeFromBlacklist, isBlacklisted } from './core/db-helpers';

const port = Number.parseInt(process.env.PORT ?? '3000', 10);
if (!Number.isFinite(port) || port <= 0) {
  throw new Error(`Invalid PORT: ${process.env.PORT}`);
}

// Initialize Database before starting server
await initDB();

/**
 * Apply rate limiting to a request
 * Returns response headers and optional error response
 */
function applyRateLimit(
  request: Request,
  preset: keyof typeof RateLimitPresets
): { headers: Record<string, string>; errorResponse?: Response } {
  const config = RateLimitPresets[preset];
  const { allowed, remaining, resetAt } = checkRateLimit(request, config);
  const headers = createRateLimitHeaders(remaining, resetAt, config.maxRequests);

  if (!allowed) {
    return { headers, errorResponse: createTooManyRequestsResponse(resetAt) };
  }

  return { headers };
}

const app = new Elysia()
  /**
   * GET /
   * Health check with statistics
   */
  .get('/', async ({ request, set }) => {
    const { headers, errorResponse } = applyRateLimit(request, 'api');
    Object.assign(set.headers, headers);
    if (errorResponse) return errorResponse;

    const stats = await getStats();
    return {
      status: 'ok',
      version: '0.3.0',
      ...stats,
    };
  })

  // --- Core Endpoints ---

  /**
   * GET /v1/endorsements
   * Query params: ?subject={url}
   */
  .get('/v1/endorsements', async ({ request, query, set }) => {
    const { headers, errorResponse } = applyRateLimit(request, 'api');
    Object.assign(set.headers, headers);
    if (errorResponse) return errorResponse;

    const subject = query.subject;
    if (!subject) return { error: 'Missing subject parameter' };

    const results = await db.endorsements.getBySubject(subject);
    return results;
  }, {
    query: t.Object({
      subject: t.String()
    })
  })

  /**
   * GET /v1/notes
   * Query params: ?subject={url}
   */
  .get('/v1/notes', async ({ request, query, set }) => {
    const { headers, errorResponse } = applyRateLimit(request, 'api');
    Object.assign(set.headers, headers);
    if (errorResponse) return errorResponse;

    const subject = query.subject;
    if (!subject) return { error: 'Missing subject parameter' };

    return db.notes.getBySubject(subject);
  }, {
    query: t.Object({
      subject: t.String()
    })
  })

  /**
   * POST /v1/crawl
   * Body: { domain: "example.com" }
   * Trigger a manual crawl (admin-only)
   */
  .post('/v1/crawl', async ({ request, body, set }) => {
    // Admin-only endpoint
    const authError = requireAdmin(request);
    if (authError) return authError;

    const { headers, errorResponse } = applyRateLimit(request, 'crawl');
    Object.assign(set.headers, headers);
    if (errorResponse) return errorResponse;

    const domain = body.domain;
    if (!domain) return { error: 'Missing domain' };

    // Run async to not block response
    crawlDomain(domain).catch(err => console.error(err));

    return { status: 'Crawl started', domain };
  }, {
    body: t.Object({
      domain: t.String()
    })
  })

  // --- Search Endpoints ---

  /**
   * GET /v1/endorsements/search
   * Query params: ?q={query}&category={cat}&limit={n}&offset={n}
   */
  .get('/v1/endorsements/search', async ({ request, query, set }) => {
    const { headers, errorResponse } = applyRateLimit(request, 'search');
    Object.assign(set.headers, headers);
    if (errorResponse) return errorResponse;

    const result = await searchEndorsements({
      query: query.q,
      category: query.category,
      limit: query.limit ? parseInt(query.limit) : 20,
      offset: query.offset ? parseInt(query.offset) : 0,
    });

    return result;
  }, {
    query: t.Object({
      q: t.Optional(t.String()),
      category: t.Optional(t.String()),
      limit: t.Optional(t.String()),
      offset: t.Optional(t.String()),
    })
  })

  /**
   * GET /v1/notes/search
   * Query params: ?q={query}&limit={n}&offset={n}
   */
  .get('/v1/notes/search', async ({ request, query, set }) => {
    const { headers, errorResponse } = applyRateLimit(request, 'search');
    Object.assign(set.headers, headers);
    if (errorResponse) return errorResponse;

    const result = await searchNotes({
      query: query.q,
      limit: query.limit ? parseInt(query.limit) : 20,
      offset: query.offset ? parseInt(query.offset) : 0,
    });

    return result;
  }, {
    query: t.Object({
      q: t.Optional(t.String()),
      limit: t.Optional(t.String()),
      offset: t.Optional(t.String()),
    })
  })

  /**
   * GET /v1/categories
   * List all unique categories
   */
  .get('/v1/categories', async ({ request, set }) => {
    const { headers, errorResponse } = applyRateLimit(request, 'api');
    Object.assign(set.headers, headers);
    if (errorResponse) return errorResponse;

    const categories = await getCategories();
    return { categories };
  })

  // --- Discovery Endpoints ---

  /**
   * GET /v1/domains
   * Query params: ?sort={recent|endorsements|domain}&status={success|error|pending}&limit={n}&offset={n}
   */
  .get('/v1/domains', async ({ request, query, set }) => {
    const { headers, errorResponse } = applyRateLimit(request, 'api');
    Object.assign(set.headers, headers);
    if (errorResponse) return errorResponse;

    const result = await listDomains({
      sort: query.sort as 'recent' | 'endorsements' | 'domain' | undefined,
      status: query.status as 'success' | 'error' | 'pending' | undefined,
      limit: query.limit ? parseInt(query.limit) : 50,
      offset: query.offset ? parseInt(query.offset) : 0,
    });

    return result;
  }, {
    query: t.Object({
      sort: t.Optional(t.String()),
      status: t.Optional(t.String()),
      limit: t.Optional(t.String()),
      offset: t.Optional(t.String()),
    })
  })

  /**
   * GET /v1/endorsers/:did
   * Get endorser profile with all their endorsements
   */
  .get('/v1/endorsers/:did', async ({ request, params, set }) => {
    const { headers, errorResponse } = applyRateLimit(request, 'api');
    Object.assign(set.headers, headers);
    if (errorResponse) return errorResponse;

    const profile = await getEndorserProfile(params.did);

    if (!profile) {
      return { error: 'Endorser not found' };
    }

    return profile;
  }, {
    params: t.Object({
      did: t.String()
    })
  })

  // --- Admin Endpoints ---

  /**
   * POST /v1/admin/blacklist
   * Body: { domain: "example.com", reason?: "spam" }
   * Add a domain to the blacklist (admin-only)
   */
  .post('/v1/admin/blacklist', async ({ request, body, set }) => {
    const authError = requireAdmin(request);
    if (authError) return authError;

    const { headers, errorResponse } = applyRateLimit(request, 'admin');
    Object.assign(set.headers, headers);
    if (errorResponse) return errorResponse;

    const { domain, reason } = body;
    if (!domain) return { error: 'Missing domain' };

    await addToBlacklist(domain, reason || null);
    return { status: 'Domain blacklisted', domain };
  }, {
    body: t.Object({
      domain: t.String(),
      reason: t.Optional(t.String()),
    })
  })

  /**
   * DELETE /v1/admin/blacklist/:domain
   * Remove a domain from the blacklist (admin-only)
   */
  .delete('/v1/admin/blacklist/:domain', async ({ request, params, set }) => {
    const authError = requireAdmin(request);
    if (authError) return authError;

    const { headers, errorResponse } = applyRateLimit(request, 'admin');
    Object.assign(set.headers, headers);
    if (errorResponse) return errorResponse;

    await removeFromBlacklist(params.domain);
    return { status: 'Domain removed from blacklist', domain: params.domain };
  }, {
    params: t.Object({
      domain: t.String()
    })
  })

  /**
   * GET /v1/admin/blacklist/:domain
   * Check if a domain is blacklisted (admin-only)
   */
  .get('/v1/admin/blacklist/:domain', async ({ request, params, set }) => {
    const authError = requireAdmin(request);
    if (authError) return authError;

    const { headers, errorResponse } = applyRateLimit(request, 'admin');
    Object.assign(set.headers, headers);
    if (errorResponse) return errorResponse;

    const blacklisted = await isBlacklisted(params.domain);
    return { domain: params.domain, blacklisted };
  }, {
    params: t.Object({
      domain: t.String()
    })
  })

  /**
   * GET /v1/admin/auth
   * Check current authentication status (for testing)
   */
  .get('/v1/admin/auth', async ({ request, set }) => {
    const auth = authenticate(request);
    return {
      authenticated: auth.authenticated,
      level: auth.level,
    };
  })

  .listen(port);

console.log(
  `🦊 PeerWeight Aggregator is running at ${app.server?.hostname}:${app.server?.port}`
);
