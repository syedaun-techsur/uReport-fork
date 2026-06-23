## Epic 9: Geo-Clustering of Ticket Locations (F9)

uReport maintains a pre-computed geo-cluster index at 7 zoom levels (0–6) for map visualization. PostGIS replaces MySQL's `POINT SRID 0`, preserving the cluster hierarchy and `ticket_geodata` join table.

---

### US-9.1: View Geo-Clustered Ticket Map
**As an** Anonymous Citizen, **I want to** see a map of service requests clustered by geographic area, **so that** I can quickly identify neighborhoods with high concentrations of open issues.

**Acceptance Criteria:**
- [ ] `GET /locations` returns cluster summary objects: `{id, level, lat, lon, count}`
- [ ] `zoom_level` parameter (0–6, default 3) controls the cluster granularity returned
- [ ] Optional `status` and `category_id` filters are supported
- [ ] Only clusters containing tickets visible to the caller's role are returned
- [ ] Returns HTTP 400 if `zoom_level` is outside the range 0–6
- [ ] Response is available in JSON and XML formats

**Priority:** P1 | **Feature Ref:** F9

---

### US-9.2: Ticket Receives Geo-Cluster Assignment on Creation
**As an** Anonymous Citizen, **I want** my submitted ticket to be automatically assigned to the correct geo-cluster when I provide a location, **so that** it immediately appears on the map without staff intervention.

**Acceptance Criteria:**
- [ ] When a ticket is created with `latitude` and `longitude`, cluster assignment runs automatically
- [ ] A `ticket_geodata` row is upserted with cluster IDs for all 7 levels (0–6)
- [ ] Nearest-cluster is determined using PostGIS KNN (`<->` operator) against the `geoclusters` table
- [ ] If no `geoclusters` rows exist for a given level, `cluster_id_{L}` is set to `NULL`
- [ ] Tickets without lat/lon have no `ticket_geodata` row

**Priority:** P1 | **Feature Ref:** F9

---

### US-9.3: Geo-Cluster Assignment Updates When Ticket Location Changes
**As a** Case Worker, **I want** the geo-cluster assignment to update automatically when I correct a ticket's location, **so that** the map accurately reflects the new coordinates.

**Acceptance Criteria:**
- [ ] Geo-cluster assignment is re-run whenever `latitude` or `longitude` is changed on a ticket update
- [ ] The `ticket_geodata` row is upserted (ON CONFLICT DO UPDATE) with new cluster IDs
- [ ] If lat/lon are cleared (set to null), the `ticket_geodata` row is deleted
- [ ] Re-cluster operation does not fail the ticket update if Solr or other side-effects fail

**Priority:** P1 | **Feature Ref:** F9

---

### US-9.4: Bulk Re-Cluster All Tickets After Migration
**As a** Department Supervisor, **I want** a bulk re-cluster script to rebuild all geo-cluster assignments after the database migration, **so that** the map is fully populated before go-live.

**Acceptance Criteria:**
- [ ] `scripts/recluster.ts` truncates `ticket_geodata` before rebuilding
- [ ] All tickets with non-null lat/lon are processed in batches of 500
- [ ] Progress is logged (tickets processed, elapsed time)
- [ ] Script is idempotent — safe to re-run
- [ ] After re-clustering, GiST spatial index on `geoclusters.center` is in place for efficient queries

**Priority:** P1 | **Feature Ref:** F9

---
