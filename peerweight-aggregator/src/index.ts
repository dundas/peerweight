import { Elysia, t } from 'elysia';
import { db, initDB } from './core/db';
import { crawlDomain } from './ingester';

const port = Number.parseInt(process.env.PORT ?? '3000', 10);
if (!Number.isFinite(port) || port <= 0) {
  throw new Error(`Invalid PORT: ${process.env.PORT}`);
}

// Initialize Database before starting server
await initDB();

const app = new Elysia()
  .get('/', () => ({ status: 'PeerWeight Aggregator Running', version: '0.1.0' }))

  // --- Endpoints ---

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
   * trigger a manual crawl
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

  .listen(port);

console.log(
  `🦊 PeerWeight Aggregator is running at ${app.server?.hostname}:${app.server?.port}`
);
