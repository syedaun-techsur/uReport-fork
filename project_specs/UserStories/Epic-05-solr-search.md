## Epic 5: Full-Text Search via Apache Solr (F5)

uReport uses Apache Solr for full-text ticket search with field-specific indexing, faceting, and result ranking. The Solarium (PHP) integration is replaced by a Node Solr client while preserving all query behavior, field mappings, and result ordering.

---

### US-5.1: Search Tickets with Full-Text Query
**As a** Case Worker, **I want to** search tickets using a free-text query, **so that** I can quickly find related issues, duplicates, or tickets matching a reported location or description.

**Acceptance Criteria:**
- [ ] `GET /search` accepts a `q` parameter for full-text search; defaults to `*:*` (all) if omitted
- [ ] Search uses eDisMax query parser with field boosts: `description^2`, `location^1.5`, `city^1`, `customFields^1`
- [ ] Wildcard prefix matching is applied when `q` has no spaces and does not end in `*`
- [ ] Only tickets in categories visible to the caller's role are returned (RBAC category filter)
- [ ] Results load in ≤ 500ms for common query patterns (NFR-6)
- [ ] Results are available in all five formats (HTML/JSON/XML/CSV/TXT) via the serialization interceptor (F3)

**Priority:** P1 | **Feature Ref:** F5

---

### US-5.2: Filter Search Results by Status, Category, Department, and Date Range
**As a** Case Worker, **I want to** filter my search results by status, category, department, assignee, and date range, **so that** I can narrow my queue to the most relevant tickets.

**Acceptance Criteria:**
- [ ] Supports filter parameters: `status`, `category_id`, `department_id`, `assignedPerson_id`, `start_date`, `end_date`
- [ ] Filter queries are ANDed together (all active filters must match)
- [ ] `sort` parameter accepts `relevance` (default) or `date`
- [ ] `page` (default 1) and `rows` (default 25, max 500) control pagination
- [ ] Response includes `total`, `page`, `rows`, `results`, and `facets` objects

**Priority:** P1 | **Feature Ref:** F5

---

### US-5.3: View Search Facets for Quick Narrowing
**As a** Case Worker, **I want to** see facet counts for categories, statuses, and departments alongside search results, **so that** I can quickly understand the distribution of results and narrow my view.

**Acceptance Criteria:**
- [ ] Facets returned in the response include: `categories` (`[{id, name, count}]`), `statuses` (`[{value, count}]`), `departments` (`[{id, name, count}]`)
- [ ] Facet counts reflect the active role-based category visibility filter
- [ ] Facet fields match the legacy Solr facet configuration exactly

**Priority:** P1 | **Feature Ref:** F5

---

### US-5.4: New and Updated Tickets are Automatically Indexed
**As a** Case Worker, **I want** tickets to appear in search results immediately after creation, update, or closure, **so that** my search queue is always up to date.

**Acceptance Criteria:**
- [ ] Ticket is indexed in Solr after `create`, `update`, and `close` operations
- [ ] Solr document includes all required fields: `id`, `status`, `description`, `category_id`, `category_name`, `department_id`, `department_name`, `assignedPerson_id`, `enteredDate`, `lastModified`, `location`, `city`, `latitude`, `longitude`, `substatus_id`, `substatus_name`, `issueType_id`, `customFields`
- [ ] If Solr is unavailable, the indexing failure is logged (F14) but does not fail the ticket write operation
- [ ] Field names match the legacy Solr schema exactly

**Priority:** P1 | **Feature Ref:** F5

---

### US-5.5: Bulk Re-Index All Tickets (Migration Support)
**As a** Department Supervisor, **I want** a bulk re-index script to rebuild the entire Solr index from the database, **so that** the search index is consistent after data migration.

**Acceptance Criteria:**
- [ ] Re-index script deletes all documents from Solr (`deleteByQuery *:*`) before inserting
- [ ] Tickets are loaded from PostgreSQL in batches of 500
- [ ] All tickets are indexed and a final `commit` is issued
- [ ] Progress is logged (tickets indexed, elapsed time)
- [ ] Script exits with a non-zero code on error

**Priority:** P1 | **Feature Ref:** F5

---
