## Priority Breakdown

### P0 — Critical (Must-Have for MVP / Public Contract)

These stories represent the minimum viable re-platform. The system cannot go live without them. Failure in any P0 story constitutes a blocking defect.

| Count | Epics |
|---|---|
| 31 stories | F0 (Open311 API), F1 (Ticket Lifecycle), F2 (RBAC), F3 (Content Negotiation), F4 (OIDC Auth), F6 (Schema Migration) |

**Key constraints:**
- Open311 GeoReport v2 response bodies must be byte-compatible with the legacy PHP implementation
- RBAC allow/deny decisions must match the legacy Laminas ACL rules exactly
- All five content formats (HTML/JSON/XML/CSV/TXT) must be byte-compatible per endpoint
- OIDC login flow and session behavior must be identical to the original

---

### P1 — High (Core Feature Parity)

These stories complete the feature parity goal. Required before the system is considered fully re-platformed.

| Count | Epics |
|---|---|
| 30 stories | F5 (Solr Search), F7 (Email), F8 (Media), F9 (Geo-Clustering), F10 (Category Admin), F11 (People/Clients) |

**Key constraints:**
- Solr query result sets (same IDs, same order) must match legacy Solarium output
- Email notification triggers and template resolution must match legacy PHPMailer behavior
- Geo-cluster assignments and coordinate precision must match pre-migration values (to 6 decimal places)

---

### P2 — Medium (Productivity & Operations)

These stories provide operational visibility and staff productivity features. Not blocking for go-live, but required for production-quality operations.

| Count | Epics |
|---|---|
| 18 stories | F12 (Bookmarks), F13 (Reporting), F14 (GELF Logging), F15 (Reference Data) |

---

### Dependency Map

```
F4 (OIDC) ──→ F2 (RBAC)
F6 (Migration) ──→ F2 (RBAC) ──→ F0 (Open311 API)
                             ──→ F1 (Ticket Lifecycle) ──→ F7 (Email)
                                                        ──→ F8 (Media)
F6 (Migration) ──→ F1 (Ticket Lifecycle) ──→ F5 (Solr Search) ──→ F12 (Bookmarks)
F3 (Serialization) ──→ F0, F1, F5, F13 (all output endpoints)
F1 (Tickets) ──→ F9 (Geo-Clustering)
F15 (Reference Data) ──→ F1 (Ticket Lifecycle) ──→ F7 (Email)
```

---

*UserStories generated: 2026-06-23 | Derived from PRD-uReport.md, FRD-uReport.md, PERSONAS-uReport.md | Model: claude-sonnet-4-6*
