import { Elysia, t } from 'elysia';
import { db, initDB } from './core/db';
import { crawlDomain } from './ingester';

// Initialize Database
initDB();

const app = new Elysia()
  .get('/', () => ({ status: 'PeerWeight Aggregator Running', version: '0.1.0' }))
  
  // --- Endpoints ---

  /**
   * GET /v1/endorsements
   * Query params: ?subject={url}
   */
  .get('/v1/endorsements', ({ query }) => {
    const subject = query.subject;
    if (!subject) return { error: 'Missing subject parameter' };

    const results = db.query(`
      SELECT * FROM endorsements 
      WHERE subject_url = $subject OR subject_id = $subject
      ORDER BY issued DESC
    `).all({ $subject: subject });

    // Parse categories back to JSON
    return results.map((r: any) => ({
      ...r,
      categories: JSON.parse(r.categories || '[]')
    }));
  }, {
    query: t.Object({
      subject: t.String()
    })
  })

  /**
   * GET /v1/notes
   * Query params: ?subject={url}
   */
  .get('/v1/notes', ({ query }) => {
    const subject = query.subject;
    if (!subject) return { error: 'Missing subject parameter' };

    return db.query(`
      SELECT * FROM notes 
      WHERE subject_url = $subject OR subject_id = $subject
      ORDER BY issued ASC
    `).all({ $subject: subject });
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

  .listen(3000);

console.log(
  `🦊 PeerWeight Aggregator is running at ${app.server?.hostname}:${app.server?.port}`
);
