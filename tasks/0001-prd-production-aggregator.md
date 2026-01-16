# PRD: PeerWeight Production Aggregator

**Version:** 1.0
**Date:** January 15, 2026
**Status:** Draft
**Owner:** PeerWeight Protocol Team

---

## 1. Introduction/Overview

The PeerWeight Production Aggregator is a public service that crawls, indexes, and serves PeerWeight protocol primitives (Endorsements, Notes, Identities) from domains implementing the `.well-known/peerweight` specification. It functions as a discovery layer for the decentralized trust web, enabling AI agents, developers, and end users to query trust signals without needing to crawl the entire web themselves.

Unlike the current reference implementation (which provides basic storage and retrieval), the production aggregator is designed for real-world use with:
- **Real-time indexing** for immediate discovery of new trust signals
- **Fast full-text search** across endorsements and notes
- **Admin dashboard** for operators to monitor system health and manage domains
- **Rate limiting and abuse protection** to prevent spam and DoS attacks
- **Production-grade reliability** with proper error handling, logging, and monitoring
- **Simple deployment** as a single binary with embedded database

This service targets **small scale** (1-100K domains, <1M endorsements) and prioritizes simplicity over massive scalability. It serves as both a functional public aggregator and a reference implementation for others who want to run their own instances.

### Target Users

1. **AI Agent Developers**: Build agents that query trust signals for product recommendations, research discovery, and content curation
2. **Web Publishers/Domain Owners**: Get their content indexed in the trust network and monitor crawl status

### Key Constraints

- Single-server deployment optimized for Bun runtime
- SQLite-based storage (no distributed database complexity)
- No trust graph computation in this version (Views support deferred)
- Public read access, admin-only write operations
- Minimal web UI for exploration, full functionality via REST API

---

## 2. Goals

### Primary Goals

1. **Provide reliable public aggregator service** that indexes PeerWeight-enabled domains and serves trust signals via REST API
2. **Enable AI agent integration** with fast, predictable APIs and comprehensive documentation
3. **Support self-hosting** with simple deployment (single binary, minimal configuration)
4. **Maintain protocol compliance** by correctly implementing all PeerWeight primitives and verification

### Secondary Goals

1. **Build trust in the ecosystem** by demonstrating that production aggregators can be built and operated reliably
2. **Gather operational data** to inform future protocol improvements and scalability patterns
3. **Create reference architecture** that other aggregator operators can learn from

### Success Metrics

- **Uptime**: 99.9% availability over 30-day periods
- **Query latency**: p95 < 100ms for endorsement/note queries
- **Index freshness**: New domains indexed within 1 hour of submission
- **Coverage**: Successfully index 95%+ of submitted well-formed domains
- **Developer satisfaction**: NPS > 40 from API users (measured via surveys)

---

## 3. User Stories

### AI Agent Developers

**Story 1: Query endorsements for a product**
> As an AI agent developer,
> I want to query all endorsements for a specific product URL,
> So that my agent can recommend products based on trust signals from verified reviewers.

**Story 2: Search endorsements by category**
> As an AI agent developer,
> I want to search endorsements filtered by category (e.g., "commerce/kitchen/knives"),
> So that my agent can find relevant recommendations in specific domains.

**Story 3: Verify endorsement signatures**
> As an AI agent developer,
> I want the aggregator to only return cryptographically verified endorsements,
> So that I can trust the data without re-verifying every signature myself.

**Story 4: Discover new domains**
> As an AI agent developer,
> I want to list recently indexed domains or endorsers,
> So that my agent can discover new sources of trust signals to incorporate.

### Web Publishers/Domain Owners

**Story 5: Submit domain for indexing**
> As a domain owner,
> I want to submit my domain to the aggregator,
> So that my endorsements become discoverable to the PeerWeight network.

**Story 6: Monitor crawl status**
> As a domain owner,
> I want to see the status of my domain's last crawl (success, errors, timestamp),
> So that I can debug any issues preventing my content from being indexed.

**Story 7: Understand indexing errors**
> As a domain owner,
> I want clear error messages when my domain fails to index (e.g., "Invalid signature on endorsement X"),
> So that I can fix the issue and retry.

### Aggregator Operators/Admins

**Story 8: Monitor system health**
> As an aggregator operator,
> I want a dashboard showing system metrics (request rate, database size, error rate, crawl queue),
> So that I can identify and resolve issues before they impact users.

**Story 9: Block abusive domains**
> As an aggregator operator,
> I want to blacklist domains that publish spam or violate protocol rules,
> So that the aggregator maintains quality and doesn't serve malicious content.

**Story 10: Review API usage patterns**
> As an aggregator operator,
> I want to see API usage by endpoint and rate limit violations,
> So that I can optimize performance and adjust rate limits appropriately.

---

## 4. Functional Requirements

### 4.1 Core API Endpoints

**REQ-1.1: Query endorsements by subject**
- `GET /v1/endorsements?subject={url|did}` returns all verified endorsements for a subject
- Results ordered by `issued` timestamp (newest first)
- Response includes full endorsement objects with parsed categories
- Returns 400 if subject parameter is missing or malformed

**REQ-1.2: Query notes by subject**
- `GET /v1/notes?subject={url|did}` returns all verified notes for a subject
- Results ordered by `issued` timestamp (oldest first) for threading support
- Response includes full note objects with `replyTo` for conversation trees
- Returns 400 if subject parameter is missing or malformed

**REQ-1.3: Submit domain for crawling**
- `POST /v1/crawl` (admin-only) triggers crawl of specified domain
- Request body: `{ "domain": "example.com" }`
- Returns immediately with 202 Accepted (async crawling)
- Returns 401 if admin API key is missing or invalid
- Returns 400 if domain is malformed or blacklisted

**REQ-1.4: Health check endpoint**
- `GET /` returns `{ "status": "ok", "version": "1.0.0", "indexedDomains": 1234 }`
- Used for uptime monitoring and load balancer health checks

### 4.2 Search and Discovery

**REQ-2.1: Full-text search across endorsements**
- `GET /v1/endorsements/search?q={query}&category={cat}` supports keyword search in `claim` and `review` fields
- Optional `category` filter (e.g., `commerce/kitchen`)
- Returns ranked results by relevance (BM25 or similar)
- Pagination support with `limit` and `offset` parameters

**REQ-2.2: List recently indexed domains**
- `GET /v1/domains?sort=recent&limit=50` returns domains ordered by last crawl time
- Supports filtering by crawl status (success, error, pending)
- Returns domain metadata (domain, DID, last_crawled, endorsement_count, note_count)

**REQ-2.3: Get endorser profile**
- `GET /v1/endorsers/{did}` returns all endorsements issued by a specific DID
- Includes endorser metadata (domain, public key, total endorsements)
- Useful for discovering what a trusted person recommends

### 4.3 Crawler and Indexing

**REQ-3.1: Domain crawling via well-known endpoints**
- Fetch `https://{domain}/.well-known/peerweight/did.json` for identity
- Fetch `https://{domain}/.well-known/peerweight/endorsements.json` for endorsements
- Fetch `https://{domain}/.well-known/peerweight/notes.jsonl` for notes
- Fetch `https://{domain}/.well-known/peerweight/revocations.jsonl` for revocations (if present)

**REQ-3.2: Cryptographic verification**
- Verify Ed25519 signatures on all endorsements and notes against DID's public key
- Reject objects with invalid signatures (log warning, do not index)
- Support multibase-encoded public keys and signatures per protocol spec

**REQ-3.3: Schema validation**
- Validate all endorsements against EndorsementSchema (Zod)
- Validate all notes against NoteSchema (Zod)
- Reject malformed objects (log warning, do not index)
- Provide clear error messages in crawl logs

**REQ-3.4: Crawl scheduling and retry**
- Support manual crawls via `POST /v1/crawl`
- Support automatic periodic re-crawls (configurable interval, default 24h)
- Retry failed crawls with exponential backoff (3 retries max)
- Respect HTTP caching headers (ETag, Last-Modified) to avoid redundant fetches

**REQ-3.5: Revocation support**
- Fetch and process `revocations.jsonl` to mark items as revoked
- Revoked items excluded from query results but retained in database
- Track revocation metadata (reason, timestamp)

### 4.4 Admin Dashboard

**REQ-4.1: System overview page**
- Display key metrics: total domains, total endorsements, total notes, database size
- Display real-time stats: requests/minute, average latency, error rate
- Display crawl queue status: pending, in-progress, failed

**REQ-4.2: Domain management page**
- List all indexed domains with status, last crawl time, item counts
- Search/filter domains by name, status, or DID
- View detailed crawl logs for each domain (timestamps, errors, warnings)
- Button to trigger manual re-crawl for a domain
- Button to blacklist/unblacklist domains

**REQ-4.3: API usage analytics**
- Display request count by endpoint (last 24h, 7d, 30d)
- Display rate limit violations by IP/key
- Display slow queries (p95, p99 latency by endpoint)

**REQ-4.4: Authentication for dashboard**
- Simple admin login with username/password (or API key header)
- Session management (JWT or cookie-based)
- HTTPS required for production deployment

### 4.5 Rate Limiting and Abuse Protection

**REQ-5.1: Anonymous user rate limits**
- Public read endpoints: 100 requests/minute per IP
- Return 429 Too Many Requests with `Retry-After` header when limit exceeded
- Use sliding window algorithm (not fixed window)

**REQ-5.2: Admin API key authentication**
- Admin-only endpoints (`POST /v1/crawl`, `/admin/*`) require `Authorization: Bearer {key}` header
- Support multiple admin keys (rotatable)
- Admin keys stored as hashed values (bcrypt or similar)

**REQ-5.3: Domain blacklisting**
- Support manual blacklist of domains that violate protocol or publish spam
- Blacklisted domains not crawled and their content excluded from queries
- Blacklist persisted in database (`blacklisted_domains` table)
- Admin dashboard provides interface to add/remove blacklist entries

**REQ-5.4: Basic DDoS protection**
- Connection rate limiting at HTTP server level (Elysia middleware)
- Request size limits (max 1MB payload)
- Timeout limits (5s for read requests, 30s for crawl requests)

---

## 5. Non-Goals (Out of Scope)

### Explicitly Out of Scope for v1.0

**NG-1: Trust graph computation and Views**
- Personalized ranking based on trust propagation is deferred to a future version
- This version only indexes and serves raw endorsements; clients compute rankings themselves
- Views primitive (trust anchor lists) not supported yet

**NG-2: Content hosting or caching**
- The aggregator does NOT store the actual web pages, products, or media being endorsed
- Only trust signals (endorsements, notes) are indexed
- No content mirroring, archiving, or CDN functionality

**NG-3: Social features**
- No user accounts, profiles, or social graphs (beyond DID-based identities)
- No following/followers, direct messaging, or notifications
- Pure trust signal aggregation; social layers can be built on top by others

**NG-4: Monetization and billing**
- Free public service with no payment processing
- No subscriptions, premium tiers, or API usage billing
- Future versions may add optional paid tiers for higher limits

**NG-5: Advanced search features**
- No semantic search, AI-powered recommendations, or ML-based ranking
- No autocomplete, spell correction, or "did you mean" suggestions
- Simple keyword and category filtering only

**NG-6: Distributed/federated aggregators**
- Single centralized instance; no federation protocol between aggregators
- Future versions may explore aggregator federation for redundancy

**NG-7: Browser extension or client apps**
- No browser extensions, mobile apps, or desktop clients
- Pure backend service; UIs built by third parties

---

## 6. Design Considerations

### 6.1 API Design Principles

- **RESTful**: Standard HTTP methods (GET, POST), meaningful URLs, proper status codes
- **JSON everywhere**: All requests and responses use JSON (except JSONL for streaming)
- **Backward compatible**: Once v1 API is stable, maintain compatibility; introduce v2 for breaking changes
- **Self-documenting**: OpenAPI 3.0 spec published at `/openapi.yaml`
- **Error clarity**: Structured error responses with `{ "error": "message", "code": "ERROR_CODE" }`

### 6.2 Database Schema Evolution

- Current schema (identities, endorsements, notes, revoked_items) is minimal
- Production adds:
  - `blacklisted_domains` table for abuse control
  - `admin_keys` table for API key management
  - `crawl_logs` table for debugging and analytics
  - Indexes on frequently queried columns (subject_url, issuer, categories, issued)
- Use Bun's SQLite migrations for schema versioning

### 6.3 Web UI Design

- **Minimal and functional**: Simple HTML/CSS, no heavy frontend framework
- **Mobile-responsive**: Works on phones and tablets (basic responsive design)
- **Accessibility**: WCAG 2.1 AA compliance for keyboard navigation and screen readers
- **Pages**:
  - `/` - Homepage with search box and recent endorsements
  - `/search?q=...` - Search results page
  - `/domain/{domain}` - Domain detail page (endorsements from this domain)
  - `/endorser/{did}` - Endorser profile page (all endorsements by this DID)
  - `/admin` - Dashboard (authentication required)

### 6.4 Deployment Architecture

```
┌─────────────────────────────────────────┐
│         Bun HTTP Server (Elysia)       │
│  ┌────────────┬─────────┬────────────┐ │
│  │ Public API │ Web UI  │ Admin API  │ │
│  └────────────┴─────────┴────────────┘ │
│              ↓                          │
│  ┌──────────────────────────────────┐  │
│  │   Rate Limiter Middleware        │  │
│  └──────────────────────────────────┘  │
│              ↓                          │
│  ┌──────────────────────────────────┐  │
│  │   Business Logic Layer           │  │
│  │   (Query, Crawl, Verify)         │  │
│  └──────────────────────────────────┘  │
│              ↓                          │
│  ┌──────────────────────────────────┐  │
│  │   SQLite Database (bun:sqlite)   │  │
│  │   + FTS5 for full-text search    │  │
│  └──────────────────────────────────┘  │
└─────────────────────────────────────────┘
         ↓                    ↑
    Crawl Queue          Well-known
    (async workers)      Endpoints
```

- **Single process**: All components in one Bun process (no microservices)
- **Embedded database**: SQLite with WAL mode for concurrency
- **Background workers**: Bun's `setInterval` for scheduled crawls, simple in-memory queue for async crawls
- **Logging**: Structured JSON logs to stdout (easily parseable by log aggregators)
- **Monitoring**: Expose `/metrics` endpoint with Prometheus-compatible metrics

### 6.5 Security Considerations

- **HTTPS only in production**: Enforce TLS for all connections (Let's Encrypt recommended)
- **Input validation**: Sanitize all user inputs (domain names, search queries) to prevent injection
- **SQL injection protection**: Use parameterized queries (already implemented with Bun's query API)
- **XSS prevention**: Escape all user-generated content in web UI (endorsement text, note text)
- **CORS**: Allow cross-origin requests from any origin (public API)
- **Admin API security**: API keys passed via `Authorization` header, not query params (to avoid logging)
- **Rate limiting**: Prevent brute force attacks on admin login/API keys

---

## 7. Technical Considerations

### 7.1 Technology Stack

- **Runtime**: Bun (latest stable)
- **Web framework**: Elysia (Bun-native, fast, type-safe)
- **Database**: SQLite via `bun:sqlite` with FTS5 extension for full-text search
- **Schema validation**: Zod (already in use)
- **Cryptography**: `tweetnacl` for Ed25519 verification (already in use)
- **Testing**: `bun test` with test coverage target of 80%+
- **Deployment**: Single binary via `bun build --compile` (optional) or direct `bun run`

### 7.2 Performance Targets

- **Query latency**: p50 < 10ms, p95 < 100ms, p99 < 500ms
- **Crawl throughput**: 10 domains/minute (parallel crawls with concurrency limit)
- **Database size**: Optimize for <10GB on disk (sufficient for 1M endorsements)
- **Memory usage**: <512MB RSS under normal load (small VPS friendly)

### 7.3 Scalability Path (Future)

While v1.0 targets small scale, design should not preclude future scaling:
- Database can be migrated to PostgreSQL without API changes (abstract DB layer)
- Crawl queue can be externalized to Redis or message queue (RabbitMQ, SQS)
- Search can be delegated to Elasticsearch or MeiliSearch
- Multiple aggregator instances can be load-balanced (stateless design)

### 7.4 Testing Strategy

- **Unit tests**: Core crypto verification, schema validation, business logic
- **Integration tests**: End-to-end API tests (seed database, make requests, assert responses)
- **Crawl tests**: Mock well-known endpoints, verify correct parsing and storage
- **Load tests**: Simulate 100 concurrent users querying API (ensure p95 < 100ms)
- **Security tests**: Test rate limiting, admin auth, input validation, XSS/injection prevention

### 7.5 Monitoring and Observability

- **Metrics** (exposed at `/metrics` in Prometheus format):
  - `http_requests_total{endpoint, method, status}` - Counter
  - `http_request_duration_seconds{endpoint}` - Histogram
  - `crawl_jobs_total{status}` - Counter (success, failure, pending)
  - `db_size_bytes` - Gauge
  - `indexed_domains_total` - Gauge
  - `indexed_endorsements_total` - Gauge

- **Logging**:
  - Structured JSON logs with `timestamp`, `level`, `message`, `context`
  - Log levels: DEBUG, INFO, WARN, ERROR
  - Include request_id for tracing requests across logs

- **Alerting** (via external tools like Grafana):
  - Alert if uptime < 99.9% in 24h window
  - Alert if error rate > 5% of requests
  - Alert if crawl failure rate > 20%
  - Alert if p95 latency > 200ms for 5+ minutes

---

## 8. Success Metrics

### Launch Criteria (Before Public Beta)

- [ ] All core API endpoints implemented and tested (REQ-1.*)
- [ ] Search functionality working with <100ms p95 latency (REQ-2.*)
- [ ] Crawler successfully indexing 10+ test domains (REQ-3.*)
- [ ] Admin dashboard accessible with authentication (REQ-4.*)
- [ ] Rate limiting functional and tested under load (REQ-5.*)
- [ ] 80%+ test coverage (unit + integration)
- [ ] OpenAPI spec published and validated
- [ ] Deployment documentation complete (README with setup instructions)
- [ ] Monitoring and logging operational

### 30-Day Success Metrics (After Launch)

- **Reliability**: 99.9% uptime
- **Performance**: p95 query latency < 100ms
- **Coverage**: 50+ domains indexed
- **Usage**: 10K+ API requests/day
- **Quality**: <1% of indexed endorsements with invalid signatures
- **Developer satisfaction**: 3+ developers building on the API (via community engagement)

### 90-Day Success Metrics

- **Reliability**: 99.95% uptime
- **Coverage**: 500+ domains indexed
- **Usage**: 100K+ API requests/day
- **Growth**: 20%+ month-over-month growth in indexed domains
- **Community**: 10+ self-hosted instances reported (via forum/Discord)

---

## 9. Open Questions

**Q1: Should we support content negotiation for different response formats?**
- Options: JSON-only vs. JSON + JSON-LD + ActivityPub
- Decision needed by: Before API freeze
- Blocker: If we want interoperability with Fediverse, need ActivityPub support

**Q2: How should we handle domain ownership disputes?**
- Scenario: Domain changes hands, new owner publishes different endorsements
- Current behavior: Latest crawl overwrites previous (by design)
- Question: Should we archive historical endorsements?
- Decision needed by: Before beta

**Q3: Should the aggregator actively discover new domains (crawl links)?**
- Current: Domains manually submitted via `POST /v1/crawl`
- Alternative: Follow links in endorsements to discover new domains
- Tradeoff: Automated discovery increases coverage but also risk of spam
- Decision needed by: Before beta

**Q4: What's the policy for removing illegal content?**
- Scenario: Aggregator indexes endorsements linking to illegal material
- Question: What's the takedown process? Who decides?
- Legal consideration: Aggregator operator liability
- Decision needed by: Before public launch

**Q5: Should we implement GraphQL API in addition to REST?**
- Benefit: Flexible queries, reduce over-fetching
- Cost: Added complexity, larger bundle size
- User feedback: Do AI agent developers prefer GraphQL?
- Decision needed by: Before v1.0 freeze

---

## 10. Appendix

### 10.1 Example API Responses

**GET /v1/endorsements?subject=https://example.com/product**

```json
[
  {
    "type": "PeerWeightEndorsement",
    "id": "urn:uuid:550e8400-e29b-41d4-a716-446655440000",
    "issuer": "did:peerweight:example.com",
    "subject": {
      "url": "https://example.com/product",
      "resourceType": "product"
    },
    "weight": 5,
    "disclosure": "purchased",
    "categories": ["commerce/kitchen/knives"],
    "claim": "Best chef's knife I've ever used",
    "review": "After 6 months of daily use...",
    "issued": "2026-01-15T12:00:00Z",
    "proof": {
      "type": "Ed25519Signature2020",
      "proofValue": "z5dG3..."
    }
  }
]
```

**GET /v1/endorsements/search?q=chef+knife&category=commerce/kitchen**

```json
{
  "results": [...],
  "total": 42,
  "limit": 20,
  "offset": 0
}
```

**GET /v1/domains?sort=recent&limit=5**

```json
[
  {
    "domain": "example.com",
    "did": "did:peerweight:example.com",
    "last_crawled": "2026-01-15T12:00:00Z",
    "status": "success",
    "endorsement_count": 15,
    "note_count": 3
  }
]
```

### 10.2 Database Schema (Production)

```sql
CREATE TABLE identities (
  did TEXT PRIMARY KEY,
  domain TEXT UNIQUE NOT NULL,
  public_key_multibase TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_crawled TEXT
);

CREATE TABLE endorsements (
  id TEXT PRIMARY KEY,
  issuer TEXT NOT NULL,
  subject_url TEXT,
  subject_id TEXT,
  weight INTEGER NOT NULL,
  disclosure TEXT NOT NULL,
  categories TEXT NOT NULL, -- JSON array
  claim TEXT,
  review TEXT,
  issued TEXT NOT NULL,
  proof_value TEXT NOT NULL,
  indexed_at TEXT NOT NULL,
  revoked BOOLEAN DEFAULT FALSE,
  FOREIGN KEY(issuer) REFERENCES identities(did)
);

CREATE TABLE notes (
  id TEXT PRIMARY KEY,
  issuer TEXT NOT NULL,
  subject_url TEXT,
  subject_id TEXT,
  reply_to TEXT,
  text TEXT NOT NULL,
  issued TEXT NOT NULL,
  proof_value TEXT NOT NULL,
  indexed_at TEXT NOT NULL,
  revoked BOOLEAN DEFAULT FALSE,
  FOREIGN KEY(issuer) REFERENCES identities(did)
);

CREATE TABLE revoked_items (
  id TEXT PRIMARY KEY,
  issuer TEXT NOT NULL,
  type TEXT NOT NULL, -- 'endorsement' or 'note'
  reason TEXT,
  revoked_at TEXT NOT NULL,
  FOREIGN KEY(issuer) REFERENCES identities(did)
);

CREATE TABLE blacklisted_domains (
  domain TEXT PRIMARY KEY,
  reason TEXT,
  blacklisted_at TEXT NOT NULL
);

CREATE TABLE admin_keys (
  key_hash TEXT PRIMARY KEY,
  description TEXT,
  created_at TEXT NOT NULL,
  last_used TEXT
);

CREATE TABLE crawl_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  domain TEXT NOT NULL,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  status TEXT NOT NULL, -- 'pending', 'success', 'error'
  error_message TEXT,
  endorsements_found INTEGER,
  notes_found INTEGER
);

-- Indexes for common queries
CREATE INDEX idx_endorsements_subject_url ON endorsements(subject_url);
CREATE INDEX idx_endorsements_subject_id ON endorsements(subject_id);
CREATE INDEX idx_endorsements_issuer ON endorsements(issuer);
CREATE INDEX idx_endorsements_issued ON endorsements(issued DESC);
CREATE INDEX idx_notes_subject_url ON notes(subject_url);
CREATE INDEX idx_notes_subject_id ON notes(subject_id);
CREATE INDEX idx_notes_issuer ON notes(issuer);

-- Full-text search virtual table
CREATE VIRTUAL TABLE endorsements_fts USING fts5(
  id UNINDEXED,
  claim,
  review,
  content=endorsements,
  content_rowid=rowid
);
```

### 10.3 Configuration File Format

`config.json`:

```json
{
  "server": {
    "port": 3000,
    "host": "0.0.0.0",
    "cors": true
  },
  "database": {
    "path": "./peerweight.sqlite",
    "wal_mode": true
  },
  "crawler": {
    "max_concurrent": 5,
    "timeout_ms": 5000,
    "retry_attempts": 3,
    "auto_crawl_interval_hours": 24
  },
  "rate_limits": {
    "anonymous_rpm": 100,
    "admin_rpm": 1000
  },
  "admin": {
    "keys": ["$2b$10$..."], // bcrypt hashes
    "dashboard_enabled": true
  },
  "logging": {
    "level": "info",
    "format": "json"
  }
}
```

### 10.4 Deployment Checklist

**Pre-deployment:**
- [ ] Set up production server (VPS with 2 CPU, 2GB RAM minimum)
- [ ] Install Bun runtime
- [ ] Configure HTTPS with Let's Encrypt
- [ ] Set up systemd service or PM2 for process management
- [ ] Configure firewall (allow 80, 443; block 3000 if proxying)
- [ ] Set up monitoring (Prometheus + Grafana or similar)
- [ ] Create admin API keys and store securely
- [ ] Review and update `config.json` for production settings

**Deployment:**
- [ ] Clone repository to server
- [ ] Run `bun install` to install dependencies
- [ ] Run database migrations: `bun run migrations/setup.ts`
- [ ] Build frontend assets if applicable
- [ ] Start server: `bun run src/index.ts`
- [ ] Verify health check: `curl https://aggregator.example.com/`
- [ ] Test admin login and dashboard access
- [ ] Trigger test crawl via admin API

**Post-deployment:**
- [ ] Set up automated backups (daily SQLite dump to S3 or equivalent)
- [ ] Configure monitoring alerts
- [ ] Announce public beta to PeerWeight community
- [ ] Monitor error logs and performance metrics for first 72 hours
- [ ] Gather feedback from early users
- [ ] Iterate based on feedback

---

## 11. Timeline (Estimated)

**Week 1-2: Core API Implementation**
- Implement search endpoints (REQ-2.*)
- Add full-text search with SQLite FTS5
- Implement pagination and filtering
- Write API integration tests

**Week 3: Crawler Enhancements**
- Add crawl scheduling and retry logic (REQ-3.4)
- Implement revocation support (REQ-3.5)
- Add detailed crawl logging
- Write crawler tests with mocked endpoints

**Week 4: Rate Limiting & Auth**
- Implement rate limiting middleware (REQ-5.1)
- Add admin API key authentication (REQ-5.2)
- Add domain blacklisting (REQ-5.3)
- Write security tests

**Week 5-6: Admin Dashboard**
- Build dashboard UI (HTML/CSS/minimal JS)
- Implement system metrics page (REQ-4.1)
- Implement domain management page (REQ-4.2)
- Add authentication for dashboard (REQ-4.4)

**Week 7: Minimal Web UI**
- Build search interface for end users
- Build domain and endorser detail pages
- Ensure mobile responsiveness
- Test accessibility

**Week 8: Testing & Documentation**
- Write comprehensive test suite (unit + integration + load)
- Achieve 80%+ test coverage
- Write deployment documentation
- Write API documentation (OpenAPI spec)
- Write developer onboarding guide

**Week 9: Beta Deployment**
- Deploy to staging server
- Run load tests and performance profiling
- Fix any critical bugs
- Deploy to production
- Announce public beta

**Week 10+: Monitoring & Iteration**
- Monitor metrics and logs
- Gather user feedback
- Fix bugs and optimize performance
- Plan v1.1 features based on feedback

---

**End of PRD**
