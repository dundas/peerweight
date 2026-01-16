# Task List: PeerWeight Production Aggregator

**Source PRD:** `tasks/0001-prd-production-aggregator.md`
**Generated:** 2026-01-15

---

## Relevant Files

### New Files to Create

**Search & Discovery Module:**
- `peerweight-aggregator/src/search/fts.ts` - Full-text search implementation using SQLite FTS5
- `peerweight-aggregator/src/search/fts.test.ts` - Unit tests (15+ assertions)
- `peerweight-aggregator/src/search/filters.ts` - Category filtering and pagination logic
- `peerweight-aggregator/src/search/filters.test.ts` - Unit tests (10+ assertions)

**Admin Module:**
- `peerweight-aggregator/src/admin/auth.ts` - Admin API key authentication middleware
- `peerweight-aggregator/src/admin/auth.test.ts` - Unit tests (12+ assertions)
- `peerweight-aggregator/src/admin/dashboard.ts` - Dashboard routes and data aggregation
- `peerweight-aggregator/src/admin/dashboard.test.ts` - Unit tests (8+ assertions)
- `peerweight-aggregator/src/admin/ui/index.html` - Dashboard homepage
- `peerweight-aggregator/src/admin/ui/domains.html` - Domain management page
- `peerweight-aggregator/src/admin/ui/metrics.html` - System metrics page
- `peerweight-aggregator/src/admin/ui/styles.css` - Dashboard styles

**Rate Limiting Module:**
- `peerweight-aggregator/src/middleware/ratelimit.ts` - Rate limiting middleware
- `peerweight-aggregator/src/middleware/ratelimit.test.ts` - Unit tests (10+ assertions)

**Crawler Enhancement:**
- `peerweight-aggregator/src/crawler/scheduler.ts` - Crawl scheduling and retry logic
- `peerweight-aggregator/src/crawler/scheduler.test.ts` - Unit tests (12+ assertions)
- `peerweight-aggregator/src/crawler/revocations.ts` - Revocation processing
- `peerweight-aggregator/src/crawler/revocations.test.ts` - Unit tests (8+ assertions)

**Monitoring & Logging:**
- `peerweight-aggregator/src/monitoring/logger.ts` - Structured JSON logger
- `peerweight-aggregator/src/monitoring/logger.test.ts` - Unit tests (6+ assertions)
- `peerweight-aggregator/src/monitoring/metrics.ts` - Prometheus metrics collection
- `peerweight-aggregator/src/monitoring/metrics.test.ts` - Unit tests (8+ assertions)

**Web UI:**
- `peerweight-aggregator/src/web/index.html` - Public homepage with search
- `peerweight-aggregator/src/web/search.html` - Search results page
- `peerweight-aggregator/src/web/domain.html` - Domain detail page
- `peerweight-aggregator/src/web/endorser.html` - Endorser profile page
- `peerweight-aggregator/src/web/styles.css` - Public UI styles
- `peerweight-aggregator/src/web/routes.ts` - Web UI route handlers
- `peerweight-aggregator/src/web/routes.test.ts` - Unit tests (6+ assertions)

**Configuration:**
- `peerweight-aggregator/config.example.json` - Example configuration file
- `peerweight-aggregator/src/config/loader.ts` - Configuration loader and validator
- `peerweight-aggregator/src/config/loader.test.ts` - Unit tests (8+ assertions)

**Database Migrations:**
- `peerweight-aggregator/src/migrations/001_add_production_tables.ts` - Migration script
- `peerweight-aggregator/src/migrations/002_add_indexes.ts` - Index creation
- `peerweight-aggregator/src/migrations/003_setup_fts5.ts` - FTS5 virtual table setup

**Testing:**
- `peerweight-aggregator/src/test/setup.ts` - Test utilities and fixtures
- `peerweight-aggregator/src/test/integration/api.test.ts` - API integration tests (20+ assertions)
- `peerweight-aggregator/src/test/integration/crawler.test.ts` - Crawler integration tests (15+ assertions)
- `peerweight-aggregator/src/test/load/endpoints.test.ts` - Load tests for API endpoints

**Documentation:**
- `peerweight-aggregator/openapi.yaml` - Updated OpenAPI 3.0 specification
- `peerweight-aggregator/DEPLOYMENT.md` - Deployment guide
- `peerweight-aggregator/CONFIGURATION.md` - Configuration reference
- `peerweight-aggregator/API.md` - API usage examples

### Existing Files to Modify

- `peerweight-aggregator/src/core/db.ts` - Add new tables, indexes, and FTS5 setup
- `peerweight-aggregator/src/index.ts` - Add new routes, middleware, and monitoring
- `peerweight-aggregator/src/ingester.ts` - Add retry logic, scheduling, and detailed logging
- `peerweight-aggregator/src/core/models.ts` - Add schemas for new features (if needed)
- `peerweight-aggregator/package.json` - Add new dependencies
- `peerweight-aggregator/README.md` - Update with production features

---

## Commit & PR Strategy

### Commit Frequency
- **Small commits:** After each logical unit of work (e.g., one function + test)
- **Commit message format:** `type(scope): description`
- **Types:** `feat`, `fix`, `test`, `refactor`, `docs`, `chore`

### PR Strategy
- **One PR per parent task** (9 PRs total)
- Each PR includes: implementation + tests + documentation updates
- PR naming: `feat: [Parent Task Name]`
- Merge strategy: Squash and merge to keep main branch clean
- All PRs require CI tests to pass before merge

### PR Gates (Required for Each Parent Task)
Each parent task MUST include these gates before merge:

1. **Create PR with detailed description**
   - Push all commits to feature branch
   - Create PR with comprehensive description of changes
   - List all files modified/created with brief explanation
   - Link to PRD requirements addressed

2. **Code Review and Gap Analysis**
   - Review PR code against PRD requirements
   - Create gap analysis comparing current implementation to "ready to merge" state
   - Document missing features, edge cases, test coverage gaps
   - Document code quality issues (naming, structure, error handling)

3. **Address Gaps**
   - Fix all critical gaps identified in review
   - Add missing tests or edge case handling
   - Improve code quality issues
   - Push fixes with detailed commit messages

4. **Final Review and Merge**
   - Verify all gaps addressed
   - Ensure CI passes
   - Add final comment summarizing changes and verification
   - Squash merge to main

### PR Dependencies
- PR 1 (Task 1.0) → can start immediately
- PR 2 (Task 2.0) → depends on PR 1 (needs schema changes)
- PR 3 (Task 3.0) → depends on PR 1 (needs schema changes)
- PR 4 (Task 4.0) → independent, can run in parallel with PR 2/3
- PR 5 (Task 5.0) → depends on PR 1, 3, 4
- PR 6 (Task 6.0) → depends on PR 2
- PR 7 (Task 7.0) → independent, can run early
- PR 8 (Task 8.0) → depends on all feature PRs (1-6)
- PR 9 (Task 9.0) → can run incrementally throughout, final PR depends on all

---

## Tasks

### 1.0 Database Schema Enhancement
**Agent:** `reliability-engineer`
**PR:** `#1 - feat: database schema enhancement with FTS5 and production tables`
**Effort:** Medium
**Depends on:** (none)

- [ ] **1.1** Create migration system
  - **File:** `peerweight-aggregator/src/migrations/runner.ts` (create)
  - **Action:** Implement migration runner that tracks applied migrations in a `schema_migrations` table
  - **Test:** `peerweight-aggregator/src/migrations/runner.test.ts` (8+ assertions for up/down/status)
  - **Commit:** `feat(db): add migration runner system`
  - **Agent:** `reliability-engineer`

- [ ] **1.2** Create production tables migration
  - **File:** `peerweight-aggregator/src/migrations/001_add_production_tables.ts` (create)
  - **Action:** Add `blacklisted_domains`, `admin_keys`, `crawl_logs` tables with constraints
  - **Test:** Migration test in `runner.test.ts` (verify table creation)
  - **Commit:** `feat(db): add production tables for admin features`
  - **Agent:** `reliability-engineer`

- [ ] **1.3** Add database indexes migration
  - **File:** `peerweight-aggregator/src/migrations/002_add_indexes.ts` (create)
  - **Action:** Create indexes on subject_url, issuer, issued, categories for query performance
  - **Test:** Verify index existence in migration test
  - **Commit:** `feat(db): add indexes for query performance`
  - **Agent:** `reliability-engineer`

- [ ] **1.4** Set up FTS5 full-text search
  - **File:** `peerweight-aggregator/src/migrations/003_setup_fts5.ts` (create)
  - **Action:** Create `endorsements_fts` and `notes_fts` virtual tables using FTS5
  - **Test:** Verify FTS tables exist and can perform searches
  - **Commit:** `feat(db): add FTS5 full-text search tables`
  - **Agent:** `reliability-engineer`

- [ ] **1.5** Update db.ts with new schema
  - **File:** `peerweight-aggregator/src/core/db.ts` (modify)
  - **Action:** Update initDB() to call migration runner instead of inline CREATE TABLE statements
  - **Test:** Integration test verifying all tables exist after init
  - **Commit:** `refactor(db): migrate to migration-based schema setup`
  - **Agent:** `reliability-engineer`

- [ ] **1.6** Add database query helpers
  - **File:** `peerweight-aggregator/src/core/db-helpers.ts` (create)
  - **Action:** Create type-safe query helpers for common operations (getEndorsementsBySubject, etc.)
  - **Test:** `peerweight-aggregator/src/core/db-helpers.test.ts` (10+ assertions)
  - **Commit:** `feat(db): add type-safe query helpers`
  - **Agent:** `tdd-developer`

- [ ] **1.7** Create PR with detailed description
  - **Action:** Push all commits to feature branch `feat/database-schema-enhancement`
  - **Action:** Create PR with title "feat: database schema enhancement with FTS5 and production tables"
  - **Action:** Write comprehensive PR description listing:
    - All new files created (migrations, runner, helpers, tests)
    - All modified files (db.ts)
    - Summary of changes (migration system, FTS5, new tables, indexes)
    - PRD requirements addressed (REQ-1.*, database schema from Appendix 10.2)
  - **Agent:** `tdd-developer`

- [ ] **1.8** Code review and gap analysis
  - **Action:** Review PR code against PRD database requirements
  - **Action:** Check migration system works correctly (up/down/rollback)
  - **Action:** Verify all tables created with correct constraints
  - **Action:** Verify FTS5 tables functional and indexed properly
  - **Action:** Check test coverage for all new code (target 80%+)
  - **Action:** Create gap analysis document identifying:
    - Missing indexes or constraints
    - Untested edge cases (migration failures, FTS5 errors)
    - Code quality issues (error handling, naming conventions)
  - **Agent:** `coach` (or manual review)

- [ ] **1.9** Address gaps and push fixes
  - **Action:** Fix all critical gaps from gap analysis
  - **Action:** Add missing tests for edge cases
  - **Action:** Improve error handling in migration runner
  - **Action:** Push fixes with detailed commit messages
  - **Action:** Add comment to PR describing fixes made
  - **Agent:** `reliability-engineer`

- [ ] **1.10** Final review and merge
  - **Action:** Verify all gaps addressed and CI passes
  - **Action:** Add final PR comment summarizing:
    - Total files changed (X created, Y modified)
    - Test coverage achieved (Z%)
    - Key features delivered (migration system, FTS5, production tables)
    - Verification steps completed
  - **Action:** Squash merge to main with complete commit message
  - **Agent:** Manual review + merge

---

### 2.0 Search and Discovery APIs
**Agent:** `tdd-developer`
**PR:** `#2 - feat: search and discovery APIs with FTS5`
**Effort:** Large
**Depends on:** PR #1

- [ ] **2.1** Implement FTS5 search module
  - **File:** `peerweight-aggregator/src/search/fts.ts` (create)
  - **Action:** Create `searchEndorsements()` and `searchNotes()` functions using FTS5 MATCH queries
  - **Test:** `peerweight-aggregator/src/search/fts.test.ts` (15+ assertions covering keyword search, ranking)
  - **Commit:** `feat(search): implement FTS5 full-text search`
  - **Agent:** `tdd-developer`

- [ ] **2.2** Implement category filtering
  - **File:** `peerweight-aggregator/src/search/filters.ts` (create)
  - **Action:** Add category filter logic with hierarchical matching (e.g., "commerce" matches "commerce/kitchen")
  - **Test:** `peerweight-aggregator/src/search/filters.test.ts` (10+ assertions)
  - **Commit:** `feat(search): add category filtering with hierarchy support`
  - **Agent:** `tdd-developer`

- [ ] **2.3** Implement pagination
  - **File:** `peerweight-aggregator/src/search/filters.ts` (modify)
  - **Action:** Add pagination logic with limit/offset, validate bounds, return total count
  - **Test:** Update `filters.test.ts` (5+ new assertions for pagination)
  - **Commit:** `feat(search): add pagination support`
  - **Agent:** `tdd-developer`

- [ ] **2.4** Add search endpoint to API
  - **File:** `peerweight-aggregator/src/index.ts` (modify)
  - **Action:** Add `GET /v1/endorsements/search?q={query}&category={cat}&limit={n}&offset={n}`
  - **Test:** Integration test in `api.test.ts` (8+ assertions)
  - **Commit:** `feat(api): add endorsement search endpoint`
  - **Agent:** `tdd-developer`

- [ ] **2.5** Implement domain listing endpoint
  - **File:** `peerweight-aggregator/src/index.ts` (modify)
  - **Action:** Add `GET /v1/domains?sort=recent&status={status}&limit={n}` with domain metadata
  - **Test:** Integration test in `api.test.ts` (6+ assertions)
  - **Commit:** `feat(api): add domain listing endpoint`
  - **Agent:** `tdd-developer`

- [ ] **2.6** Implement endorser profile endpoint
  - **File:** `peerweight-aggregator/src/index.ts` (modify)
  - **Action:** Add `GET /v1/endorsers/{did}` returning all endorsements by DID with metadata
  - **Test:** Integration test in `api.test.ts` (6+ assertions)
  - **Commit:** `feat(api): add endorser profile endpoint`
  - **Agent:** `tdd-developer`

- [ ] **2.7** Update health endpoint with stats
  - **File:** `peerweight-aggregator/src/index.ts` (modify)
  - **Action:** Update `GET /` to include indexedDomains, totalEndorsements, totalNotes counts
  - **Test:** Integration test verifying stats are returned
  - **Commit:** `feat(api): enhance health endpoint with statistics`
  - **Agent:** `tdd-developer`

- [ ] **2.8** Create PR with detailed description
  - **Action:** Push all commits to feature branch `feat/search-discovery-apis`
  - **Action:** Create PR with title "feat: search and discovery APIs with FTS5"
  - **Action:** Write comprehensive PR description listing:
    - New search module files (fts.ts, filters.ts, tests)
    - Modified API files (index.ts)
    - New endpoints (/v1/endorsements/search, /v1/domains, /v1/endorsers/{did})
    - PRD requirements addressed (REQ-2.*)
  - **Agent:** `tdd-developer`

- [ ] **2.9** Code review and gap analysis
  - **Action:** Review PR code against PRD search requirements
  - **Action:** Test search functionality with various queries
  - **Action:** Verify pagination works correctly (edge cases: offset > total)
  - **Action:** Verify category filtering with hierarchical matching
  - **Action:** Check search performance (target p95 < 100ms)
  - **Action:** Create gap analysis document identifying:
    - Missing search features (spell correction, relevance tuning)
    - Untested edge cases (empty results, special characters in queries)
    - Performance issues or optimization opportunities
  - **Agent:** `coach` (or manual review)

- [ ] **2.10** Address gaps and push fixes
  - **Action:** Fix all critical gaps from gap analysis
  - **Action:** Add missing edge case tests
  - **Action:** Optimize slow queries if needed
  - **Action:** Push fixes with detailed commit messages
  - **Action:** Add comment to PR describing fixes and performance improvements
  - **Agent:** `tdd-developer`

- [ ] **2.11** Final review and merge
  - **Action:** Verify all gaps addressed and CI passes
  - **Action:** Run manual search tests with various queries
  - **Action:** Add final PR comment summarizing:
    - Endpoints delivered (search, domains, endorsers)
    - Test coverage achieved
    - Performance benchmarks (p95 latency)
  - **Action:** Squash merge to main
  - **Agent:** Manual review + merge

---

### 3.0 Crawler Enhancement and Scheduling
**Agent:** `reliability-engineer`
**PR:** `#3 - feat: crawler enhancement with retry, scheduling, and revocations`
**Effort:** Medium
**Depends on:** PR #1

- [ ] **3.1** Implement retry logic with exponential backoff
  - **File:** `peerweight-aggregator/src/crawler/scheduler.ts` (create)
  - **Action:** Create `retryWithBackoff()` function (3 retries, exponential delay: 1s, 2s, 4s)
  - **Test:** `peerweight-aggregator/src/crawler/scheduler.test.ts` (8+ assertions including timing)
  - **Commit:** `feat(crawler): add retry logic with exponential backoff`
  - **Agent:** `reliability-engineer`

- [ ] **3.2** Implement crawl scheduling system
  - **File:** `peerweight-aggregator/src/crawler/scheduler.ts` (modify)
  - **Action:** Add `CrawlScheduler` class with queue, periodic re-crawl (24h default), concurrency limit (5)
  - **Test:** Update `scheduler.test.ts` (12+ assertions for queue management)
  - **Commit:** `feat(crawler): add crawl scheduling system`
  - **Agent:** `reliability-engineer`

- [ ] **3.3** Implement crawl logging
  - **File:** `peerweight-aggregator/src/crawler/scheduler.ts` (modify)
  - **Action:** Log crawl start/end/errors to `crawl_logs` table with detailed error messages
  - **Test:** Verify logs written to database in tests
  - **Commit:** `feat(crawler): add detailed crawl logging`
  - **Agent:** `reliability-engineer`

- [ ] **3.4** Implement revocation processing
  - **File:** `peerweight-aggregator/src/crawler/revocations.ts` (create)
  - **Action:** Fetch and parse `revocations.jsonl`, mark items as revoked in database
  - **Test:** `peerweight-aggregator/src/crawler/revocations.test.ts` (8+ assertions)
  - **Commit:** `feat(crawler): add revocation processing`
  - **Agent:** `reliability-engineer`

- [ ] **3.5** Update ingester with new features
  - **File:** `peerweight-aggregator/src/ingester.ts` (modify)
  - **Action:** Integrate retry logic, logging, and revocation processing into crawlDomain()
  - **Test:** Update integration tests for crawler (10+ assertions)
  - **Commit:** `refactor(crawler): integrate scheduling and revocations`
  - **Agent:** `reliability-engineer`

- [ ] **3.6** Add HTTP caching support
  - **File:** `peerweight-aggregator/src/ingester.ts` (modify)
  - **Action:** Respect ETag and Last-Modified headers, skip re-fetch if not modified
  - **Test:** Mock HTTP responses with caching headers in tests (5+ assertions)
  - **Commit:** `feat(crawler): add HTTP caching support`
  - **Agent:** `tdd-developer`

- [ ] **3.7** Create PR with detailed description
  - **Action:** Push all commits to feature branch `feat/crawler-enhancement`
  - **Action:** Create PR with title "feat: crawler enhancement with retry, scheduling, and revocations"
  - **Action:** Write comprehensive PR description listing:
    - New crawler modules (scheduler.ts, revocations.ts, tests)
    - Modified ingester.ts with retry logic and logging
    - Features: exponential backoff, crawl queue, revocation processing, HTTP caching
    - PRD requirements addressed (REQ-3.*)
  - **Agent:** `reliability-engineer`

- [ ] **3.8** Code review and gap analysis
  - **Action:** Review PR code against PRD crawler requirements
  - **Action:** Test retry logic with simulated failures
  - **Action:** Verify crawl scheduling works (periodic re-crawls)
  - **Action:** Test revocation processing with mock data
  - **Action:** Check HTTP caching with ETag/Last-Modified headers
  - **Action:** Create gap analysis document identifying:
    - Missing error handling (network timeouts, malformed responses)
    - Untested edge cases (concurrent crawls, queue overflow)
    - Retry logic issues (infinite loops, backoff timing)
  - **Agent:** `coach` (or manual review)

- [ ] **3.9** Address gaps and push fixes
  - **Action:** Fix all critical gaps from gap analysis
  - **Action:** Add missing error handling and timeout protection
  - **Action:** Add tests for edge cases (concurrent crawls, failures)
  - **Action:** Push fixes with detailed commit messages
  - **Action:** Add comment to PR describing reliability improvements
  - **Agent:** `reliability-engineer`

- [ ] **3.10** Final review and merge
  - **Action:** Verify all gaps addressed and CI passes
  - **Action:** Run crawler tests with real domains (if available)
  - **Action:** Add final PR comment summarizing:
    - Crawler features delivered (retry, scheduling, revocations)
    - Reliability improvements (error handling, timeouts)
    - Test coverage for failure scenarios
  - **Action:** Squash merge to main
  - **Agent:** Manual review + merge

---

### 4.0 Rate Limiting and Authentication
**Agent:** `reliability-engineer`
**PR:** `#4 - feat: rate limiting and admin authentication`
**Effort:** Medium
**Depends on:** PR #1 (for admin_keys table)

- [ ] **4.1** Implement rate limiting middleware
  - **File:** `peerweight-aggregator/src/middleware/ratelimit.ts` (create)
  - **Action:** Create sliding window rate limiter (100 req/min per IP), return 429 with Retry-After
  - **Test:** `peerweight-aggregator/src/middleware/ratelimit.test.ts` (10+ assertions)
  - **Commit:** `feat(middleware): add rate limiting with sliding window`
  - **Agent:** `reliability-engineer`

- [ ] **4.2** Implement admin API key authentication
  - **File:** `peerweight-aggregator/src/admin/auth.ts` (create)
  - **Action:** Create `requireAdmin()` middleware that validates Bearer token against hashed keys in DB
  - **Test:** `peerweight-aggregator/src/admin/auth.test.ts` (12+ assertions including invalid keys)
  - **Commit:** `feat(admin): add API key authentication`
  - **Agent:** `reliability-engineer`

- [ ] **4.3** Implement domain blacklisting
  - **File:** `peerweight-aggregator/src/admin/blacklist.ts` (create)
  - **Action:** Create `isBlacklisted()`, `addToBlacklist()`, `removeFromBlacklist()` functions
  - **Test:** `peerweight-aggregator/src/admin/blacklist.test.ts` (8+ assertions)
  - **Commit:** `feat(admin): add domain blacklisting system`
  - **Agent:** `reliability-engineer`

- [ ] **4.4** Add admin key management CLI tool
  - **File:** `peerweight-aggregator/src/admin/keygen.ts` (create)
  - **Action:** Create CLI script to generate, add, and revoke admin API keys (bcrypt hashing)
  - **Test:** Test script execution in `keygen.test.ts` (6+ assertions)
  - **Commit:** `feat(admin): add key management CLI tool`
  - **Agent:** `tdd-developer`

- [ ] **4.5** Apply middleware to routes
  - **File:** `peerweight-aggregator/src/index.ts` (modify)
  - **Action:** Add rate limiting to public routes, admin auth to `/v1/crawl` and `/admin/*` routes
  - **Test:** Integration tests verifying middleware works (8+ assertions)
  - **Commit:** `feat(api): apply rate limiting and auth middleware`
  - **Agent:** `reliability-engineer`

- [ ] **4.6** Update crawler to check blacklist
  - **File:** `peerweight-aggregator/src/ingester.ts` (modify)
  - **Action:** Skip crawling and exclude from queries if domain is blacklisted
  - **Test:** Integration test with blacklisted domain (4+ assertions)
  - **Commit:** `feat(crawler): respect domain blacklist`
  - **Agent:** `reliability-engineer`

- [ ] **4.7** Create PR with detailed description
  - **Action:** Push all commits to feature branch `feat/rate-limiting-auth`
  - **Action:** Create PR with title "feat: rate limiting and admin authentication"
  - **Action:** Write comprehensive PR description listing:
    - New middleware (ratelimit.ts, tests)
    - New admin modules (auth.ts, blacklist.ts, keygen.ts, tests)
    - Modified index.ts and ingester.ts with middleware and blacklist checks
    - Features: sliding window rate limits, API key auth, domain blacklisting
    - PRD requirements addressed (REQ-5.*)
  - **Agent:** `reliability-engineer`

- [ ] **4.8** Code review and gap analysis
  - **Action:** Review PR code against PRD security requirements
  - **Action:** Test rate limiting under load (simulate 100+ req/min)
  - **Action:** Test admin auth with valid/invalid/expired keys
  - **Action:** Verify blacklist prevents crawling and query results
  - **Action:** Check for security issues (timing attacks, key storage)
  - **Action:** Create gap analysis document identifying:
    - Security vulnerabilities (exposed keys, weak hashing)
    - Missing rate limit scenarios (burst traffic, distributed IPs)
    - Untested edge cases (concurrent auth, blacklist updates)
  - **Agent:** `coach` (or manual security review)

- [ ] **4.9** Address gaps and push fixes
  - **Action:** Fix all critical security gaps
  - **Action:** Add missing security tests (brute force, timing attacks)
  - **Action:** Improve rate limiting for burst scenarios
  - **Action:** Push fixes with detailed commit messages
  - **Action:** Add comment to PR describing security improvements
  - **Agent:** `reliability-engineer`

- [ ] **4.10** Final review and merge
  - **Action:** Verify all security gaps addressed and CI passes
  - **Action:** Run manual security tests (rate limit bypass attempts)
  - **Action:** Add final PR comment summarizing:
    - Security features delivered (rate limiting, auth, blacklist)
    - Security testing completed (attack scenarios tested)
    - Test coverage for security edge cases
  - **Action:** Squash merge to main
  - **Agent:** Manual review + merge

---

### 5.0 Admin Dashboard (Backend + Frontend)
**Agent:** `tdd-developer` (backend), `Manual` (frontend testing)
**PR:** `#5 - feat: admin dashboard with monitoring and management`
**Effort:** Large
**Depends on:** PR #1, #3, #4

- [ ] **5.1** Create dashboard backend routes
  - **File:** `peerweight-aggregator/src/admin/dashboard.ts` (create)
  - **Action:** Implement `/admin/stats`, `/admin/domains`, `/admin/logs`, `/admin/blacklist` JSON APIs
  - **Test:** `peerweight-aggregator/src/admin/dashboard.test.ts` (8+ assertions)
  - **Commit:** `feat(admin): add dashboard backend routes`
  - **Agent:** `tdd-developer`

- [ ] **5.2** Create system overview page
  - **File:** `peerweight-aggregator/src/admin/ui/index.html` (create)
  - **Action:** Build dashboard homepage with key metrics (domains, endorsements, requests/min, errors)
  - **Test:** Manual testing in browser
  - **Commit:** `feat(admin): add system overview dashboard page`
  - **Agent:** `tdd-developer`

- [ ] **5.3** Create domain management page
  - **File:** `peerweight-aggregator/src/admin/ui/domains.html` (create)
  - **Action:** Build table with search, filter, crawl status, manual re-crawl button, blacklist button
  - **Test:** Manual testing in browser
  - **Commit:** `feat(admin): add domain management page`
  - **Agent:** `tdd-developer`

- [ ] **5.4** Create metrics analytics page
  - **File:** `peerweight-aggregator/src/admin/ui/metrics.html` (create)
  - **Action:** Display request counts by endpoint, rate limit violations, latency percentiles
  - **Test:** Manual testing in browser
  - **Commit:** `feat(admin): add API usage metrics page`
  - **Agent:** `tdd-developer`

- [ ] **5.5** Add dashboard styles
  - **File:** `peerweight-aggregator/src/admin/ui/styles.css` (create)
  - **Action:** Create responsive CSS for dashboard (mobile-friendly, clean design)
  - **Test:** Manual testing on mobile and desktop
  - **Commit:** `feat(admin): add dashboard styles`
  - **Agent:** `tdd-developer`

- [ ] **5.6** Implement dashboard authentication
  - **File:** `peerweight-aggregator/src/admin/auth.ts` (modify)
  - **Action:** Add session-based auth for dashboard (login page, cookie/JWT)
  - **Test:** Integration tests for login flow (6+ assertions)
  - **Commit:** `feat(admin): add dashboard authentication`
  - **Agent:** `reliability-engineer`

- [ ] **5.7** Wire up dashboard routes
  - **File:** `peerweight-aggregator/src/index.ts` (modify)
  - **Action:** Add routes for `/admin`, `/admin/domains`, `/admin/metrics` serving HTML + APIs
  - **Test:** Integration test verifying routes work
  - **Commit:** `feat(api): add admin dashboard routes`
  - **Agent:** `tdd-developer`

- [ ] **5.8** Create PR with detailed description
  - **Action:** Push all commits to feature branch `feat/admin-dashboard`
  - **Action:** Create PR with title "feat: admin dashboard with monitoring and management"
  - **Action:** Write comprehensive PR description listing:
    - New admin backend (dashboard.ts routes, tests)
    - New admin UI files (index.html, domains.html, metrics.html, styles.css)
    - Modified auth.ts and index.ts for dashboard routes
    - Features: system metrics, domain management, crawl logs, API analytics
    - PRD requirements addressed (REQ-4.*)
    - Screenshots of dashboard pages
  - **Agent:** `tdd-developer`

- [ ] **5.9** Code review and gap analysis
  - **Action:** Review PR code against PRD dashboard requirements
  - **Action:** Test dashboard in browser (desktop and mobile)
  - **Action:** Verify all metrics display correctly and update in real-time
  - **Action:** Test domain management features (search, filter, re-crawl, blacklist)
  - **Action:** Check dashboard authentication flow
  - **Action:** Create gap analysis document identifying:
    - Missing dashboard features (export data, advanced filters)
    - UI/UX issues (responsiveness, accessibility, navigation)
    - Untested scenarios (slow queries, large datasets)
  - **Agent:** Manual UI review

- [ ] **5.10** Address gaps and push fixes
  - **Action:** Fix all critical UI/UX gaps
  - **Action:** Improve mobile responsiveness issues
  - **Action:** Add missing accessibility features (keyboard nav, ARIA labels)
  - **Action:** Optimize slow dashboard queries
  - **Action:** Push fixes with detailed commit messages
  - **Action:** Add comment to PR with updated screenshots
  - **Agent:** `tdd-developer`

- [ ] **5.11** Final review and merge
  - **Action:** Verify all gaps addressed and CI passes
  - **Action:** Perform final manual testing (all browsers, devices)
  - **Action:** Add final PR comment summarizing:
    - Dashboard features delivered (metrics, domains, logs)
    - UI testing completed (browsers, devices, accessibility)
    - Screenshots of final implementation
  - **Action:** Squash merge to main
  - **Agent:** Manual review + merge

---

### 6.0 Minimal Public Web UI
**Agent:** `tdd-developer`
**PR:** `#6 - feat: minimal public web UI for search and browsing`
**Effort:** Medium
**Depends on:** PR #2

- [ ] **6.1** Create homepage with search
  - **File:** `peerweight-aggregator/src/web/index.html` (create)
  - **Action:** Build simple homepage with search box, recent endorsements, project info
  - **Test:** Manual testing in browser
  - **Commit:** `feat(web): add public homepage with search`
  - **Agent:** `tdd-developer`

- [ ] **6.2** Create search results page
  - **File:** `peerweight-aggregator/src/web/search.html` (create)
  - **Action:** Display search results with pagination, category filter, endorsement cards
  - **Test:** Manual testing with various queries
  - **Commit:** `feat(web): add search results page`
  - **Agent:** `tdd-developer`

- [ ] **6.3** Create domain detail page
  - **File:** `peerweight-aggregator/src/web/domain.html` (create)
  - **Action:** Show all endorsements from a domain, domain metadata, crawl status
  - **Test:** Manual testing
  - **Commit:** `feat(web): add domain detail page`
  - **Agent:** `tdd-developer`

- [ ] **6.4** Create endorser profile page
  - **File:** `peerweight-aggregator/src/web/endorser.html` (create)
  - **Action:** Display all endorsements by a DID, endorser metadata
  - **Test:** Manual testing
  - **Commit:** `feat(web): add endorser profile page`
  - **Agent:** `tdd-developer`

- [ ] **6.5** Add public UI styles
  - **File:** `peerweight-aggregator/src/web/styles.css` (create)
  - **Action:** Create responsive, accessible CSS (mobile-first, WCAG 2.1 AA)
  - **Test:** Manual testing on multiple devices and screen readers
  - **Commit:** `feat(web): add responsive public UI styles`
  - **Agent:** `tdd-developer`

- [ ] **6.6** Implement web UI route handlers
  - **File:** `peerweight-aggregator/src/web/routes.ts` (create)
  - **Action:** Create server-side rendering helpers for HTML pages with data injection
  - **Test:** `peerweight-aggregator/src/web/routes.test.ts` (6+ assertions)
  - **Commit:** `feat(web): add route handlers for public UI`
  - **Agent:** `tdd-developer`

- [ ] **6.7** Wire up web UI routes
  - **File:** `peerweight-aggregator/src/index.ts` (modify)
  - **Action:** Add routes for `/`, `/search`, `/domain/:domain`, `/endorser/:did`
  - **Test:** Integration test verifying pages load
  - **Commit:** `feat(api): add public web UI routes`
  - **Agent:** `tdd-developer`

- [ ] **6.8** Create PR with detailed description
  - **Action:** Push all commits to feature branch `feat/public-web-ui`
  - **Action:** Create PR with title "feat: minimal public web UI for search and browsing"
  - **Action:** Write comprehensive PR description listing:
    - New web UI files (index.html, search.html, domain.html, endorser.html, styles.css)
    - New routes module (routes.ts, tests)
    - Modified index.ts with web UI routes
    - Features: search interface, domain/endorser pages, mobile-responsive
    - PRD requirements addressed (REQ from section 6.3 Design Considerations)
    - Screenshots of all pages
  - **Agent:** `tdd-developer`

- [ ] **6.9** Code review and gap analysis
  - **Action:** Review PR code against PRD web UI requirements
  - **Action:** Test all pages in browser (desktop, tablet, mobile)
  - **Action:** Verify search functionality works end-to-end
  - **Action:** Test accessibility with screen reader and keyboard navigation
  - **Action:** Check WCAG 2.1 AA compliance
  - **Action:** Create gap analysis document identifying:
    - Missing UI features (filters, sorting options)
    - Accessibility issues (missing alt text, poor contrast)
    - Responsiveness problems on specific devices
    - UX improvements (loading states, error messages)
  - **Agent:** Manual UI/UX review

- [ ] **6.10** Address gaps and push fixes
  - **Action:** Fix all critical accessibility and UX gaps
  - **Action:** Improve responsive design for edge cases
  - **Action:** Add loading states and error messages
  - **Action:** Push fixes with detailed commit messages
  - **Action:** Add comment to PR with updated screenshots
  - **Agent:** `tdd-developer`

- [ ] **6.11** Final review and merge
  - **Action:** Verify all gaps addressed and CI passes
  - **Action:** Perform final cross-browser testing (Chrome, Firefox, Safari)
  - **Action:** Add final PR comment summarizing:
    - Web UI pages delivered (home, search, domain, endorser)
    - Accessibility testing completed (WCAG 2.1 AA)
    - Screenshots and browser compatibility matrix
  - **Action:** Squash merge to main
  - **Agent:** Manual review + merge

---

### 7.0 Monitoring, Logging, and Metrics
**Agent:** `tdd-developer`
**PR:** `#7 - feat: monitoring, logging, and Prometheus metrics`
**Effort:** Small
**Depends on:** (none - can run early)

- [ ] **7.1** Implement structured JSON logger
  - **File:** `peerweight-aggregator/src/monitoring/logger.ts` (create)
  - **Action:** Create logger with levels (DEBUG, INFO, WARN, ERROR), request_id tracking, JSON output
  - **Test:** `peerweight-aggregator/src/monitoring/logger.test.ts` (6+ assertions)
  - **Commit:** `feat(monitoring): add structured JSON logger`
  - **Agent:** `tdd-developer`

- [ ] **7.2** Replace console.log with logger
  - **File:** `peerweight-aggregator/src/index.ts`, `ingester.ts`, `admin/dashboard.ts` (modify)
  - **Action:** Replace all console.log/error with structured logger calls
  - **Test:** Verify logs are properly formatted in tests
  - **Commit:** `refactor(monitoring): migrate to structured logging`
  - **Agent:** `tdd-developer`

- [ ] **7.3** Implement Prometheus metrics
  - **File:** `peerweight-aggregator/src/monitoring/metrics.ts` (create)
  - **Action:** Create metrics: http_requests_total, http_request_duration_seconds, crawl_jobs_total, db_size_bytes, etc.
  - **Test:** `peerweight-aggregator/src/monitoring/metrics.test.ts` (8+ assertions)
  - **Commit:** `feat(monitoring): add Prometheus metrics collection`
  - **Agent:** `tdd-developer`

- [ ] **7.4** Add /metrics endpoint
  - **File:** `peerweight-aggregator/src/index.ts` (modify)
  - **Action:** Add `GET /metrics` returning Prometheus text format
  - **Test:** Integration test verifying metrics endpoint format
  - **Commit:** `feat(api): add Prometheus metrics endpoint`
  - **Agent:** `tdd-developer`

- [ ] **7.5** Add request tracing middleware
  - **File:** `peerweight-aggregator/src/middleware/tracing.ts` (create)
  - **Action:** Generate request_id for each request, attach to logs and response headers
  - **Test:** Integration test verifying request_id propagation
  - **Commit:** `feat(middleware): add request tracing`
  - **Agent:** `tdd-developer`

- [ ] **7.6** Create PR with detailed description
  - **Action:** Push all commits to feature branch `feat/monitoring-logging-metrics`
  - **Action:** Create PR with title "feat: monitoring, logging, and Prometheus metrics"
  - **Action:** Write comprehensive PR description listing:
    - New monitoring modules (logger.ts, metrics.ts, tests)
    - New middleware (tracing.ts)
    - Modified all source files to use structured logging
    - Features: JSON logging, Prometheus metrics, request tracing
    - PRD requirements addressed (REQ from section 7.5 Monitoring and Observability)
  - **Agent:** `tdd-developer`

- [ ] **7.7** Code review and gap analysis
  - **Action:** Review PR code against PRD monitoring requirements
  - **Action:** Test /metrics endpoint returns valid Prometheus format
  - **Action:** Verify logs are structured JSON with proper fields
  - **Action:** Test request_id propagation through log entries
  - **Action:** Check metrics collection for all endpoints
  - **Action:** Create gap analysis document identifying:
    - Missing metrics (cache hit rate, queue depth)
    - Incomplete log coverage (missing error contexts)
    - Performance impact of logging/metrics
  - **Agent:** `coach` (or manual review)

- [ ] **7.8** Address gaps and push fixes
  - **Action:** Fix all critical monitoring gaps
  - **Action:** Add missing metrics and log statements
  - **Action:** Optimize logging performance if needed
  - **Action:** Push fixes with detailed commit messages
  - **Action:** Add comment to PR with sample logs and metrics output
  - **Agent:** `tdd-developer`

- [ ] **7.9** Final review and merge
  - **Action:** Verify all gaps addressed and CI passes
  - **Action:** Test metrics with Prometheus scraper (or curl)
  - **Action:** Add final PR comment summarizing:
    - Monitoring features delivered (logging, metrics, tracing)
    - Sample log output and metrics format
    - Performance impact analysis
  - **Action:** Squash merge to main
  - **Agent:** Manual review + merge

---

### 8.0 Testing Infrastructure
**Agent:** `tdd-developer` (unit/integration), `Manual` (load tests)
**PR:** `#8 - test: comprehensive test suite with 80%+ coverage`
**Effort:** Large
**Depends on:** PR #1-6 (all feature PRs)

- [ ] **8.1** Set up test utilities and fixtures
  - **File:** `peerweight-aggregator/src/test/setup.ts` (create)
  - **Action:** Create test database helpers, mock data generators, common assertions
  - **Test:** Self-testing utilities (5+ assertions)
  - **Commit:** `test: add test utilities and fixtures`
  - **Agent:** `tdd-developer`

- [ ] **8.2** Write unit tests for crypto module
  - **File:** `peerweight-aggregator/src/core/crypto.test.ts` (create)
  - **Action:** Test signature verification with valid/invalid signatures
  - **Test:** 10+ assertions covering edge cases
  - **Commit:** `test: add crypto module unit tests`
  - **Agent:** `tdd-developer`

- [ ] **8.3** Write unit tests for models/schemas
  - **File:** `peerweight-aggregator/src/core/models.test.ts` (create)
  - **Action:** Test Zod schema validation for all primitives
  - **Test:** 15+ assertions covering valid/invalid inputs
  - **Commit:** `test: add schema validation unit tests`
  - **Agent:** `tdd-developer`

- [ ] **8.4** Write API integration tests
  - **File:** `peerweight-aggregator/src/test/integration/api.test.ts` (create)
  - **Action:** End-to-end tests for all API endpoints with real database
  - **Test:** 20+ assertions covering happy path and error cases
  - **Commit:** `test: add API integration tests`
  - **Agent:** `tdd-developer`

- [ ] **8.5** Write crawler integration tests
  - **File:** `peerweight-aggregator/src/test/integration/crawler.test.ts` (create)
  - **Action:** Test crawling with mocked HTTP endpoints (valid/invalid domains)
  - **Test:** 15+ assertions covering success, retry, and failure scenarios
  - **Commit:** `test: add crawler integration tests`
  - **Agent:** `tdd-developer`

- [ ] **8.6** Write load tests
  - **File:** `peerweight-aggregator/src/test/load/endpoints.test.ts` (create)
  - **Action:** Simulate 100 concurrent users, verify p95 latency < 100ms
  - **Test:** Load test with assertions on latency and throughput
  - **Commit:** `test: add load tests for API endpoints`
  - **Agent:** Manual execution

- [ ] **8.7** Measure and report test coverage
  - **File:** `peerweight-aggregator/package.json` (modify)
  - **Action:** Add test coverage script using Bun's built-in coverage, set threshold 80%
  - **Test:** Run coverage report, ensure 80%+ achieved
  - **Commit:** `test: add coverage reporting with 80% threshold`
  - **Agent:** `tdd-developer`

- [ ] **8.8** Create PR with detailed description
  - **Action:** Push all commits to feature branch `feat/testing-infrastructure`
  - **Action:** Create PR with title "test: comprehensive test suite with 80%+ coverage"
  - **Action:** Write comprehensive PR description listing:
    - New test utilities (setup.ts)
    - All unit test files added (crypto, models, etc.)
    - Integration test suites (api, crawler)
    - Load test implementation
    - Test coverage report (target 80%+)
    - PRD requirements addressed (section 7.4 Testing Strategy)
  - **Agent:** `tdd-developer`

- [ ] **8.9** Code review and gap analysis
  - **Action:** Review PR code against PRD testing requirements
  - **Action:** Run full test suite and verify all tests pass
  - **Action:** Check test coverage report (must be 80%+)
  - **Action:** Review test quality (assertions, edge cases, mocks)
  - **Action:** Run load tests and verify performance targets met
  - **Action:** Create gap analysis document identifying:
    - Missing test coverage areas (uncovered branches)
    - Weak tests (not testing edge cases, poor assertions)
    - Missing integration test scenarios
    - Load test results vs. PRD performance targets
  - **Agent:** `coach` (or manual review)

- [ ] **8.10** Address gaps and push fixes
  - **Action:** Fix all critical test coverage gaps
  - **Action:** Add missing edge case tests
  - **Action:** Improve weak tests with better assertions
  - **Action:** Add missing integration test scenarios
  - **Action:** Push fixes with detailed commit messages
  - **Action:** Add comment to PR with updated coverage report
  - **Agent:** `tdd-developer`

- [ ] **8.11** Final review and merge
  - **Action:** Verify all test gaps addressed and coverage > 80%
  - **Action:** Run full test suite including load tests
  - **Action:** Add final PR comment summarizing:
    - Total test coverage achieved (X%)
    - Test counts (unit, integration, load)
    - Performance test results (p95 latency, throughput)
    - All PRD testing requirements met
  - **Action:** Squash merge to main
  - **Agent:** Manual review + merge

---

### 9.0 Documentation and Deployment
**Agent:** `tdd-developer` (docs), `Manual` (deployment verification)
**PR:** `#9 - docs: deployment guide, OpenAPI spec, and configuration docs`
**Effort:** Small
**Depends on:** All previous PRs

- [ ] **9.1** Update OpenAPI specification
  - **File:** `peerweight-aggregator/openapi.yaml` (modify)
  - **Action:** Add all new endpoints (search, domains, endorsers, admin, metrics) with complete schemas
  - **Test:** Validate OpenAPI spec with online validator
  - **Commit:** `docs: update OpenAPI spec with all endpoints`
  - **Agent:** `tdd-developer`

- [ ] **9.2** Create deployment documentation
  - **File:** `peerweight-aggregator/DEPLOYMENT.md` (create)
  - **Action:** Write step-by-step deployment guide (server setup, SSL, systemd, monitoring)
  - **Test:** Manual deployment to test server following guide
  - **Commit:** `docs: add deployment guide`
  - **Agent:** `tdd-developer`

- [ ] **9.3** Create configuration documentation
  - **File:** `peerweight-aggregator/CONFIGURATION.md` (create)
  - **Action:** Document all config options with examples and defaults
  - **Test:** Review for completeness
  - **Commit:** `docs: add configuration reference`
  - **Agent:** `tdd-developer`

- [ ] **9.4** Create example configuration file
  - **File:** `peerweight-aggregator/config.example.json` (create)
  - **Action:** Provide example config with comments for all settings
  - **Test:** Validate JSON syntax
  - **Commit:** `docs: add example configuration file`
  - **Agent:** `tdd-developer`

- [ ] **9.5** Create API usage guide
  - **File:** `peerweight-aggregator/API.md` (create)
  - **Action:** Write developer-friendly API guide with curl examples for all endpoints
  - **Test:** Test all curl examples work
  - **Commit:** `docs: add API usage guide with examples`
  - **Agent:** `tdd-developer`

- [ ] **9.6** Update main README
  - **File:** `peerweight-aggregator/README.md` (modify)
  - **Action:** Update with production features, quick start, links to docs
  - **Test:** Review for accuracy
  - **Commit:** `docs: update README for production version`
  - **Agent:** `tdd-developer`

- [ ] **9.7** Add configuration loader
  - **File:** `peerweight-aggregator/src/config/loader.ts` (create)
  - **Action:** Implement config file loader with validation and defaults
  - **Test:** `peerweight-aggregator/src/config/loader.test.ts` (8+ assertions)
  - **Commit:** `feat(config): add configuration loader`
  - **Agent:** `tdd-developer`

- [ ] **9.8** Create deployment checklist
  - **File:** `peerweight-aggregator/DEPLOYMENT.md` (modify)
  - **Action:** Add pre-deployment, deployment, and post-deployment checklists from PRD
  - **Test:** Review completeness
  - **Commit:** `docs: add deployment checklist`
  - **Agent:** `tdd-developer`

- [ ] **9.9** Create PR with detailed description
  - **Action:** Push all commits to feature branch `feat/documentation-deployment`
  - **Action:** Create PR with title "docs: deployment guide, OpenAPI spec, and configuration docs"
  - **Action:** Write comprehensive PR description listing:
    - Updated OpenAPI spec (openapi.yaml)
    - New documentation files (DEPLOYMENT.md, CONFIGURATION.md, API.md)
    - Example config file (config.example.json)
    - Configuration loader implementation (loader.ts, tests)
    - Updated README.md
    - PRD requirements addressed (section 9 Documentation)
  - **Agent:** `tdd-developer`

- [ ] **9.10** Code review and gap analysis
  - **Action:** Review all documentation for accuracy and completeness
  - **Action:** Validate OpenAPI spec against actual API implementation
  - **Action:** Test all deployment steps in DEPLOYMENT.md on fresh server
  - **Action:** Test all configuration examples in CONFIGURATION.md
  - **Action:** Test all API examples in API.md with curl
  - **Action:** Create gap analysis document identifying:
    - Missing documentation sections
    - Inaccurate or outdated information
    - Broken examples or commands
    - Missing diagrams or screenshots
  - **Agent:** Manual documentation review

- [ ] **9.11** Address gaps and push fixes
  - **Action:** Fix all documentation gaps and errors
  - **Action:** Update examples with tested commands
  - **Action:** Add missing diagrams or screenshots
  - **Action:** Improve clarity and organization
  - **Action:** Push fixes with detailed commit messages
  - **Action:** Add comment to PR listing documentation improvements
  - **Agent:** `tdd-developer`

- [ ] **9.12** Final review and merge
  - **Action:** Verify all documentation gaps addressed
  - **Action:** Perform final review of all docs for accuracy
  - **Action:** Test deployment guide on clean server (if possible)
  - **Action:** Add final PR comment summarizing:
    - Documentation delivered (deployment, config, API, OpenAPI)
    - All examples tested and verified
    - Deployment checklist completed
    - Production readiness confirmed
  - **Action:** Squash merge to main
  - **Agent:** Manual review + merge

---

## Summary

**Total Sub-Tasks:** 95 sub-tasks across 9 parent tasks
  - Implementation tasks: 59 sub-tasks
  - PR gates (create, review, fix, merge): 36 sub-tasks (4 per parent task)
**Total PRs:** 9 PRs (one per parent task)
**Total New Files:** 45+ files
**Total Modified Files:** 6+ files
**Total Tests:** 200+ assertions across all test files

**PR Gates (Required for All Parent Tasks):**
Each parent task includes 4 mandatory gate steps:
1. **Create PR** - Push commits and write detailed PR description
2. **Code Review & Gap Analysis** - Review against PRD, identify gaps
3. **Address Gaps** - Fix critical issues, push updates with comments
4. **Final Review & Merge** - Verify completion, add summary comment, merge

**Agent Assignments:**
- `tdd-developer`: 52% of implementation tasks (standard features, APIs, web UI, docs)
- `reliability-engineer`: 29% of implementation tasks (database, security, crawler)
- `coach`: Used for gap analysis/code review in PR gates
- `Manual`: 19% of tasks (UI testing, load tests, final PR review/merge)

**Critical Path:**
PR #1 (Database) → PR #2 (Search) → PR #6 (Web UI)
PR #1 (Database) → PR #3 (Crawler) → PR #5 (Admin Dashboard)
PR #1 (Database) → PR #4 (Auth) → PR #5 (Admin Dashboard)
PR #7 (Monitoring) can run early
PR #8 (Testing) depends on all feature PRs
PR #9 (Docs) runs throughout, final PR at end

**Parallel Work Opportunities:**
- PR #2 (Search), PR #3 (Crawler), PR #4 (Auth), PR #7 (Monitoring) can start in parallel after PR #1
- PR #6 (Web UI) depends only on PR #2
- PR #5 (Admin) depends on PR #1, #3, #4 but can run parallel to PR #2, #6

**Estimated Timeline:**
- Week 1-2: PR #1, #7 (Database + Monitoring)
- Week 3: PR #2, #3, #4 in parallel (Search, Crawler, Auth)
- Week 4: PR #5 (Admin Dashboard)
- Week 5: PR #6 (Web UI)
- Week 6-7: PR #8 (Testing)
- Week 8: PR #9 (Documentation)
- Week 9: Final testing and production deployment

---

*Task list generated 2026-01-15 by tasklist-generator skill*
*Updated 2026-01-15 with PR gates (create, review/gap analysis, address gaps, final merge)*
