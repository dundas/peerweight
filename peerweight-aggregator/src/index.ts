import { Elysia, t } from 'elysia';
import { db, initDB } from './core/db';
import { crawlDomain } from './ingester';
import { searchEndorsements, searchNotes, getCategories } from './search/search';
import { listDomains, getEndorserProfile, getStats } from './search/discovery';

const port = Number.parseInt(process.env.PORT ?? '3000', 10);
if (!Number.isFinite(port) || port <= 0) {
  throw new Error(`Invalid PORT: ${process.env.PORT}`);
}

// Initialize Database before starting server
await initDB();

const app = new Elysia()
  /**
   * GET /
   * Health check with statistics
   */
  .get('/', async () => {
    const stats = await getStats();
    return {
      status: 'ok',
      version: '0.2.0',
      ...stats,
    };
  })

  // --- Core Endpoints ---

  /**
   * GET /v1/endorsements
   * Query params: ?subject={url}
   */
  .get('/v1/endorsements', async ({ query }) => {
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
  .get('/v1/notes', async ({ query }) => {
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
   * Trigger a manual crawl (admin-only in production)
   */
  .post('/v1/crawl', async ({ body }) => {
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
  .get('/v1/endorsements/search', async ({ query }) => {
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
  .get('/v1/notes/search', async ({ query }) => {
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
  .get('/v1/categories', async () => {
    const categories = await getCategories();
    return { categories };
  })

  // --- Discovery Endpoints ---

  /**
   * GET /v1/domains
   * Query params: ?sort={recent|endorsements|domain}&status={success|error|pending}&limit={n}&offset={n}
   */
  .get('/v1/domains', async ({ query }) => {
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
  .get('/v1/endorsers/:did', async ({ params }) => {
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

  .listen(port);

console.log(
  `🦊 PeerWeight Aggregator is running at ${app.server?.hostname}:${app.server?.port}`
);
