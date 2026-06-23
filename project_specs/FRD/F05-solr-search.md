---

## F05: Full-Text Search via Apache Solr

**Description:** uReport uses Apache Solr for full-text ticket search with field-specific indexing, faceting, and result ranking. The existing Solarium (PHP) integration is replaced by a Node Solr client while preserving all query behavior, field mappings, index schema, and facet configuration. Result sets (same IDs, same order) must be identical to the legacy Solarium queries on the same indexed data.

**Terminology:**
- **Solarium:** The PHP Solr client library replaced by the Node Solr client
- **Field boost:** A multiplier applied to a Solr field's relevance score (e.g., `description^2`)
- **Facet:** An aggregated count grouped by field value (e.g., count of tickets per status)
- **DisMax / eDisMax:** Solr query parser for relevance ranking across multiple fields
- **Re-index:** Bulk indexing of all tickets into Solr (run on migration and on demand)
- **Incremental index:** Index a single ticket on create/update/close

**Sub-features:**
- Search endpoint accepting query string, filters, and pagination
- Query construction with field boosts and phrase matching
- Facets: category, status, department, assignee, date range
- Result ranking: relevance and date sort options
- Incremental indexing on ticket create/update/close
- Re-index script for bulk initial load
- Bookmark integration (saved search URLs)

---

### F05.1 Solr Index Schema

The following fields are indexed per ticket document. Field names must match the legacy schema exactly:

| Solr Field | Source | Type | Stored | Indexed |
|-----------|--------|------|--------|---------|
| `id` | `tickets.id` | integer | yes | yes |
| `status` | `tickets.status` | string | yes | yes |
| `description` | `tickets.description` | text_general | yes | yes |
| `category_id` | `tickets.category_id` | integer | yes | yes |
| `category_name` | `categories.name` | string | yes | yes |
| `department_id` | `categories.department_id` | integer | yes | yes |
| `department_name` | `departments.name` | string | yes | yes |
| `assignedPerson_id` | `tickets.assignedPerson_id` | integer | yes | yes |
| `enteredDate` | `tickets.enteredDate` | tdate | yes | yes |
| `lastModified` | `tickets.lastModified` | tdate | yes | yes |
| `location` | `tickets.location` | string | yes | yes |
| `city` | `tickets.city` | string | yes | yes |
| `latitude` | `tickets.latitude` | double | yes | yes |
| `longitude` | `tickets.longitude` | double | yes | yes |
| `substatus_id` | `tickets.substatus_id` | integer | yes | yes |
| `substatus_name` | `substatus.name` | string | yes | yes |
| `issueType_id` | `tickets.issueType_id` | integer | yes | yes |
| `customFields` | `tickets.customFields` | text_general | yes | yes |

---

### F05.2 Search Endpoint

`GET /search[.json|.xml|.csv|.txt|.html]`

**Process:**
1. Apply role-based category visibility filter (see F02) to restrict search to permitted categories.
2. Parse query parameters into a Solr query object.
3. Build eDisMax query with field boosts.
4. Apply filter queries for each active filter.
5. Configure facets (category, status, department, date ranges).
6. Execute query against Solr via Node Solr client.
7. Map Solr response to ticket result objects.
8. Return paginated results with facet counts in negotiated format.

**Inputs:**
- `q` (string, optional): full-text search query; default `*:*` (all)
- `status` (string, optional): `open` or `closed`
- `category_id` (integer, optional): filter by category
- `department_id` (integer, optional): filter by department
- `assignedPerson_id` (integer, optional): filter by assignee
- `start_date` (ISO 8601, optional): `enteredDate` range start
- `end_date` (ISO 8601, optional): `enteredDate` range end
- `sort` (string, optional): `relevance` (default) or `date`
- `page` (integer, optional): 1-based page; default 1
- `rows` (integer, optional): results per page; default 25; max 500

**Outputs:**
- `total` (integer): total matching documents
- `page` (integer): current page
- `rows` (integer): page size
- `results` (array): ticket summary objects with all indexed fields
- `facets` (object):
  - `categories`: `[{id, name, count}]`
  - `statuses`: `[{value, count}]`
  - `departments`: `[{id, name, count}]`

---

### F05.3 Query Construction

The eDisMax query is constructed as follows:
```
q.alt=*:*
qf=description^2 location^1.5 city^1 customFields^1
mm=75%
pf=description^4
```

- If `q` contains spaces, wrap in double quotes for phrase matching in `pf`.
- Wildcard: if `q` does not end in `*` and has no spaces, append `*` for prefix matching.
- Filter queries (fq) are ANDed:
  - `fq=status:{status}` if status filter active
  - `fq=category_id:{id}` if category filter active
  - `fq=department_id:{id}` if department filter active
  - `fq=assignedPerson_id:{id}` if assignee filter active
  - `fq=enteredDate:[{start} TO {end}]` if date range active
  - `fq=category_id:(id1 OR id2 OR ...)` role-visibility filter (see F02)

---

### F05.4 Incremental Indexing

Triggered automatically by the `TicketService` on:
- `create` — index new ticket after persistence
- `update` — re-index ticket after any field change
- `close` — re-index ticket after status change

The Solr document is built from a join of `tickets`, `categories`, `departments`, and `substatus` tables.

If Solr is unavailable, the indexing failure is logged (see F14) but does not fail the ticket write operation.

---

### F05.5 Re-index Script

A standalone script (`scripts/reindex-solr.ts`) that:
1. Deletes all documents from the Solr index (`deleteByQuery *:*`).
2. Loads all tickets from PostgreSQL in batches of 500.
3. Builds Solr documents for each batch.
4. Submits batch `add` operations to Solr.
5. Issues a final `commit`.
6. Logs progress (tickets indexed, elapsed time).

---

### F05.6 Bookmark Integration

- When a user bookmarks a search (see F12), the `requestUri` field stores the full search URL including all query parameters.
- Recalling a bookmark re-executes the same search URL.

---

**API Surface (this feature):** see `Y1-api.md` §Search.

**Schema Surface (this feature):** reads from `tickets`, `categories`, `departments`, `substatus`; Solr index schema defined above — see `Y0-schema.md` for table DDL.
