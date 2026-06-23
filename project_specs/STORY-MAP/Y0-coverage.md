---

## Coverage Analysis

---

### Persona Coverage by Release

| Persona | R1 Coverage | R2 Coverage | R3 Coverage |
|---|---|---|---|
| **PER-01** (Anonymous Citizen) | ✅ Full anonymous submission + token lookup + geo-filtered list | ✅ Geo-cluster map view added | — |
| **PER-02** (Authenticated Resident) | ✅ OIDC login, personal ticket history, profile, RBAC | ✅ Email notifications, search, bookmarks partial, media upload | ✅ Bookmarks complete |
| **PER-03** (Case Worker) | ✅ Full ticket lifecycle: assign, update, comment, close, duplicate, audit, CSV export | ✅ Solr search + filters + facets, auto-indexing, media, person search | ✅ Bookmarks, filtered reports |
| **PER-04** (Supervisor/Admin) | ✅ Migration approval, RBAC permission config | ✅ Full category/dept admin, email templates, staff/API client management | ✅ Metrics dashboard, Graylog, reference data admin |

---

### JTBD Coverage by Release

| JTBD-ID | Persona | R1 | R2 | R3 | Notes |
|---|---|---|---|---|---|
| JTBD-01.1 | PER-01 | ✅ Full | — | — | Anonymous submission via web + API |
| JTBD-01.2 | PER-01 | ✅ Full | — | — | Token lookup, single request by ID |
| JTBD-01.3 | PER-01 | ⚪ Partial | ✅ Full | — | Open311 geo-filter in R1; map clustering in R2 |
| JTBD-02.1 | PER-02 | ✅ Full | — | — | OIDC + personal ticket history |
| JTBD-02.2 | PER-02 | ⚪ Partial | ✅ Full | — | Lifecycle audit trail in R1; email triggers in R2 |
| JTBD-02.3 | PER-02 | ❌ | — | ✅ Full | Bookmarks entirely in R3 |
| JTBD-03.1 | PER-03 | ⚪ Partial | ✅ Full | — | Staff RBAC + lifecycle in R1; Solr queue management in R2 |
| JTBD-03.2 | PER-03 | ✅ Full | — | — | Full ticket workflow with audit trail |
| JTBD-03.3 | PER-03 | ⚪ Partial | ✅ Full | — | `parent_id` assignment in R1; in-page Solr search in R2 |
| JTBD-04.1 | PER-04 | ⚪ Partial | ✅ Full | — | Migration + RBAC config in R1; category/dept admin in R2 |
| JTBD-04.2 | PER-04 | ❌ | — | ✅ Full | Metrics dashboard in R3 |
| JTBD-04.3 | PER-04 | ❌ | ✅ Full | ✅ Supplemented | API client + staff mgmt in R2; Graylog structured logging in R3 |

---

### Gap Analysis

#### Journey Stages Without Coverage
> All 8 journeys (JRN-01.1, JRN-01.2, JRN-02.1, JRN-02.2, JRN-03.1, JRN-03.2, JRN-04.1, JRN-04.2) have at least one story mapped to every stage. **No uncovered journey stages.**

#### JTBD Outcomes Without Derived NaC
> All 12 JTBD jobs have at least one NaC derived in the NaC Derivation Table. **No unaddressed JTBD outcomes.**

#### Orphan Stories (Not Mapped to Any Journey Stage)
> All 79 stories are placed in the story map matrix across PER-01 through PER-04 journey stages. **No orphan stories.**

However, the following stories serve **cross-cutting concerns** and appear in multiple persona journeys:

| Story | Cross-Persona Role |
|---|---|
| US-5.1 (Solr full-text search) | PER-02 (bookmark discovery), PER-03 (queue triage + duplicate search) |
| US-5.2 (Search filters) | PER-02 (results narrowing), PER-03 (queue + duplicate) |
| US-5.3 (Search facets) | PER-02 (results orientation), PER-03 (duplicate match review) |
| US-7.5 (Email template config) | PER-04 (admin config) + enables PER-02 and PER-03 notification journeys |
| US-3.3 (CSV export) | PER-03 (weekly report) + PER-04 (departmental reporting) |
| US-13.2 (Filtered ticket report) | PER-03 (bulk export) + PER-04 (city leadership reporting) |
| US-11.4 (Person search) | PER-03 (assignee lookup) + PER-04 (staff user management) |

#### Risks Identified
- **JTBD-02.3 fully deferred to R3:** Priya's bookmark workflow has no partial delivery in R1 or R2. If R3 is cut, this persona has no bookmark capability. Mitigation: ensure browser-URL bookmarking of Solr results pages works as a manual fallback.
- **JTBD-04.2 (metrics dashboard) deferred to R3:** Robert cannot monitor throughput without CSV export until R3. Mitigation: `US-13.2` (filtered ticket report in R2 CSV export) provides a partial data outlet, though it requires Excel.
- **Email notification infrastructure (F7) depends on F1 `ticketHistory` writes being atomic:** If `ticketHistory` write and notification trigger are not transactional, a system crash between the two could result in a missed notification. This is flagged as a production reliability risk.

---
