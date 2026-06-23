---

## Release Planning

---

### R1 — MVP Core: "Public Contract + Ticket Foundation + Auth + DB"

**Theme:** Everything required for the system to go live as a parity re-platform. No external API consumer or existing user notices any behavioral change.

**Persona Coverage:** PER-01 (full anonymous journey), PER-02 (login + ticket history), PER-03 (full case worker ticket lifecycle), PER-04 (migration approval + RBAC config)

**JTBD Addressed:**

| JTBD-ID | Status in R1 |
|---|---|
| JTBD-01.1 | ✅ Full — anonymous submission via web form and Open311 API |
| JTBD-01.2 | ✅ Full — token lookup, single request by ID |
| JTBD-01.3 | ⚪ Partial — geo-filtered request list via Open311 (`US-0.4`); map clustering deferred to R2 |
| JTBD-02.1 | ✅ Full — OIDC login, session, personal ticket history, profile |
| JTBD-02.2 | ⚪ Partial — notification infrastructure in place via ticket lifecycle; email trigger stories in R2 |
| JTBD-02.3 | ❌ Deferred to R3 |
| JTBD-03.1 | ⚪ Partial — staff RBAC and ticket lifecycle; Solr search/filter in R2 |
| JTBD-03.2 | ✅ Full — assign, update, comment, close, duplicate, re-open, audit trail, CSV export |
| JTBD-03.3 | ⚪ Partial — `parent_id` assignment available; in-page Solr search in R2 |
| JTBD-04.1 | ✅ Full — migration complete; RBAC permission filtering; category admin in R2 |
| JTBD-04.2 | ❌ Deferred to R3 |
| JTBD-04.3 | ❌ Deferred to R2 |

**R1 Stories (31 stories — all P0):**

| SM-ID | Story | Epic |
|---|---|---|
| SM-0.1 | US-0.1 Browse Available Service Categories | F0 |
| SM-0.2 | US-0.2 Retrieve Single Service Definition | F0 |
| SM-0.3 | US-0.3 Submit Service Request via Open311 API | F0 |
| SM-0.4 | US-0.4 Query Service Requests with Filters | F0 |
| SM-0.5 | US-0.5 Retrieve Single Request by ID | F0 |
| SM-0.6 | US-0.6 Look Up Request ID by Submission Token | F0 |
| SM-1.1 | US-1.1 Submit Service Request via Web Form | F1 |
| SM-1.2 | US-1.2 View Own Ticket History | F1 |
| SM-1.3 | US-1.3 Assign a Ticket to a Case Worker | F1 |
| SM-1.4 | US-1.4 Update Ticket Fields | F1 |
| SM-1.5 | US-1.5 Close a Ticket with Sub-Status | F1 |
| SM-1.6 | US-1.6 Mark a Ticket as Duplicate | F1 |
| SM-1.7 | US-1.7 Add a Staff Comment | F1 |
| SM-1.8 | US-1.8 Add a Response to a Reporter | F1 |
| SM-1.9 | US-1.9 Re-open a Closed Ticket | F1 |
| SM-1.10 | US-1.10 View Full Ticket History / Audit Trail | F1 |
| SM-2.1 | US-2.1 Anonymous Access to Public Categories | F2 |
| SM-2.2 | US-2.2 Authenticated Resident Access | F2 |
| SM-2.3 | US-2.3 Staff Full Access | F2 |
| SM-2.4 | US-2.4 Category-Level Permission Filtering | F2 |
| SM-2.5 | US-2.5 PII Field Masking for Non-Staff Callers | F2 |
| SM-3.1 | US-3.1 Request JSON Response | F3 |
| SM-3.2 | US-3.2 Request XML Response | F3 |
| SM-3.3 | US-3.3 Export Ticket List to CSV | F3 |
| SM-3.4 | US-3.4 Format Resolution Priority is Consistent | F3 |
| SM-3.5 | US-3.5 View HTML Responses in Browser | F3 |
| SM-4.1 | US-4.1 Log In via OIDC | F4 |
| SM-4.2 | US-4.2 OIDC Callback and User Provisioning | F4 |
| SM-4.3 | US-4.3 Session Persistence Across Page Loads | F4 |
| SM-4.4 | US-4.4 Log Out and Clear Session | F4 |
| SM-4.5 | US-4.5 View and Edit Own Profile | F4 |
| SM-6.1 | US-6.1 Translate MySQL DDL to PostgreSQL | F6 |
| SM-6.2 | US-6.2 Migrate All Data from MySQL to PostgreSQL | F6 |
| SM-6.3 | US-6.3 Verify Row Counts After Migration | F6 |
| SM-6.4 | US-6.4 Preserve All Seed Data | F6 |
| SM-6.5 | US-6.5 Generate Prisma Schema | F6 |

> **R1 Complete Journey Test:** PER-01 can submit an anonymous service request via web form and Open311 API, receive a token, and look it up — with zero authentication prompts. PER-02 can log in via OIDC, view personal ticket history, and see the correct permission-filtered results. PER-03 can assign, update, comment, close (with sub-status), and export tickets with full audit trail. PER-04 can approve go-live after verifying migration row counts.

---
