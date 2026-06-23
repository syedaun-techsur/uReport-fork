---

## F09: Geo-Clustering of Ticket Locations

**Description:** uReport maintains a pre-computed geo-cluster index linking tickets to spatial clusters at 7 zoom levels (0–6) for map visualization. The clustering logic is re-implemented using PostGIS, preserving the cluster hierarchy and `ticket_geodata` join table. Cluster assignments are computed on migration and updated incrementally on ticket create/update.

**Terminology:**
- **Cluster level:** An integer 0–6 representing a zoom level; level 0 = coarsest (fewest, largest clusters), level 6 = finest (most, smallest clusters)
- **Cluster center:** The centroid geometry of a cluster (`geoclusters.center` as PostGIS `geometry(Point, 4326)`)
- **Cluster assignment:** The cluster each ticket belongs to at each level (stored in `ticket_geodata`)
- **Nearest cluster:** The cluster whose center is geographically closest to the ticket's lat/lon
- **Re-cluster:** Bulk rebuilding of all `ticket_geodata` rows (run after migration)

**Sub-features:**
- Cluster table management (`geoclusters`)
- Ticket geo-data join table (`ticket_geodata`)
- Cluster assignment algorithm (nearest-neighbor per level)
- Re-cluster script (bulk rebuild)
- Incremental cluster assignment on ticket create/update
- Map endpoint returning cluster data

---

### F09.1 Data Model

**`geoclusters` table:**
- `id`: primary key
- `level`: integer 0–6 (which zoom level this cluster belongs to)
- `center`: PostGIS `geometry(Point, 4326)` — cluster centroid

**`ticket_geodata` table:**
- `ticket_id`: FK to `tickets.id` (primary key of this table)
- `cluster_id_0` through `cluster_id_6`: FK to `geoclusters.id` — the assigned cluster at each level

A ticket with a known lat/lon must have exactly one row in `ticket_geodata` with one cluster assignment per level (0–6). Tickets without lat/lon have no `ticket_geodata` row.

---

### F09.2 Cluster Assignment Algorithm

For a ticket with `latitude` and `longitude`:

1. Build PostGIS point: `ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)`.
2. For each level L in {0, 1, 2, 3, 4, 5, 6}:
   a. Execute nearest-neighbor query:
      ```sql
      SELECT id FROM geoclusters
      WHERE level = L
      ORDER BY center <-> ST_SetSRID(ST_MakePoint($lon, $lat), 4326)
      LIMIT 1
      ```
   b. The `<->` operator uses the PostGIS KNN GiST index for efficient nearest-neighbor lookup.
   c. Record the returned `geoclusters.id` as `cluster_id_{L}`.
3. Upsert `ticket_geodata` row:
   ```sql
   INSERT INTO ticket_geodata (ticket_id, cluster_id_0, ..., cluster_id_6)
   VALUES ($ticketId, $c0, ..., $c6)
   ON CONFLICT (ticket_id) DO UPDATE SET
     cluster_id_0 = EXCLUDED.cluster_id_0, ...
   ```

If no `geoclusters` rows exist at a given level, `cluster_id_{L}` is set to `NULL`.

---

### F09.3 Re-cluster Script

**Script:** `scripts/recluster.ts`

**Process:**
1. Truncate `ticket_geodata` table.
2. Load all tickets with non-null `latitude` and `longitude` from `tickets`.
3. For each ticket, run the assignment algorithm (§9.2).
4. Batch-insert `ticket_geodata` rows (batches of 500).
5. Log progress: tickets processed, elapsed time.

This script is run once after the MySQL → PostgreSQL data migration and is idempotent (truncates first).

---

### F09.4 Incremental Cluster Assignment

The `TicketService` calls the cluster assignment algorithm (§9.2) automatically:
- On ticket **create**: if `latitude` and `longitude` are provided.
- On ticket **update**: if `latitude` or `longitude` changed.
- If lat/lon are cleared (set to null): delete the `ticket_geodata` row for the ticket.

---

### F09.5 Map Endpoint

`GET /locations[.json|.xml]`

**Process:**
1. Apply role-based category visibility filter (see F02).
2. Accept optional filter parameters (`status`, `category_id`, `zoom_level`).
3. Query `ticket_geodata` JOIN `geoclusters` for the requested zoom level.
4. Return cluster summary objects: `{cluster_id, lat, lon, count}`.

**Inputs:**
- `zoom_level` (integer 0–6, optional): default 3
- `status` (string, optional): `open` or `closed`
- `category_id` (integer, optional): filter by category

**Outputs:**
- Array of cluster summary objects:
  - `id` (integer): geoclusters.id
  - `level` (integer): zoom level
  - `lat` (float): cluster center latitude
  - `lon` (float): cluster center longitude
  - `count` (integer): number of tickets assigned to this cluster matching the filters

**Error States:**
| Scenario | HTTP Status | Error Code | Message |
|----------|-------------|------------|---------|
| Invalid zoom_level | 400 | INVALID_INPUT | "zoom_level must be 0–6" |

---

### F09.6 Spatial Index

The following index must exist for efficient nearest-neighbor queries:
```sql
CREATE INDEX idx_geoclusters_center ON geoclusters USING GIST(center);
```

---

**API Surface (this feature):** see `Y1-api.md` §Locations.

**Schema Surface (this feature):** uses `geoclusters`, `ticket_geodata`, `tickets` — see `Y0-schema.md`.
