---

### R2 — Feature Parity: "Search, Notifications, Media, Geo, Admin"

**Theme:** Completes full feature parity with the PHP system. Every workflow that was possible in the legacy system is now available in the re-platformed system.

**Persona Coverage:** All four personas — full workflows enabled.

**JTBD Addressed (incremental beyond R1):**

| JTBD-ID | Status in R2 |
|---|---|
| JTBD-01.3 | ✅ Full — geo-cluster map view (`US-9.1`, `US-9.2`) |
| JTBD-02.2 | ✅ Full — all email notification types wired (`US-7.1`–`US-7.5`) |
| JTBD-03.1 | ✅ Full — Solr search with filters and facets; auto-indexing; assignee person search |
| JTBD-03.3 | ✅ Full — in-page Solr duplicate search; facets for quick confirmation |
| JTBD-04.1 | ✅ Full — full category and department admin; email template overrides |
| JTBD-04.3 | ✅ Full — staff person CRUD, API client credential management |

**R2 Stories (30 stories — all P1):**

| SM-ID | Story | Epic | Primary Persona |
|---|---|---|---|
| SM-5.1 | US-5.1 Search Tickets with Full-Text Query | F5 | PER-03, PER-02 |
| SM-5.2 | US-5.2 Filter Search Results | F5 | PER-03, PER-02 |
| SM-5.3 | US-5.3 View Search Facets | F5 | PER-03, PER-02 |
| SM-5.4 | US-5.4 Tickets Auto-Indexed on Create/Update/Close | F5 | PER-03 |
| SM-5.5 | US-5.5 Bulk Re-Index All Tickets | F5 | PER-04 |
| SM-7.1 | US-7.1 Email on Ticket Opened | F7 | PER-01 |
| SM-7.2 | US-7.2 Email on Ticket Assigned | F7 | PER-02 |
| SM-7.3 | US-7.3 Email on Ticket Closed | F7 | PER-02 |
| SM-7.4 | US-7.4 Email for Response, Comment, Duplicate | F7 | PER-02 |
| SM-7.5 | US-7.5 Configure Email Templates per Category | F7 | PER-04 |
| SM-7.6 | US-7.6 Digest Notification Email | F7 | PER-02 |
| SM-8.1 | US-8.1 Upload Photo or Document Attachment | F8 | PER-02, PER-03 |
| SM-8.2 | US-8.2 Auto-Generate Thumbnail for Images | F8 | PER-03 |
| SM-8.3 | US-8.3 View and Download Attachment | F8 | PER-03 |
| SM-8.4 | US-8.4 Delete an Attachment | F8 | PER-03 |
| SM-9.1 | US-9.1 View Geo-Clustered Ticket Map | F9 | PER-01 |
| SM-9.2 | US-9.2 Ticket Receives Cluster Assignment on Creation | F9 | PER-01 |
| SM-9.3 | US-9.3 Cluster Updates When Ticket Location Changes | F9 | PER-03 |
| SM-9.4 | US-9.4 Bulk Re-Cluster After Migration | F9 | PER-04 |
| SM-10.1 | US-10.1 Create and Edit Service Category | F10 | PER-04 |
| SM-10.2 | US-10.2 Delete Service Category | F10 | PER-04 |
| SM-10.3 | US-10.3 Manage Category Groups | F10 | PER-04 |
| SM-10.4 | US-10.4 Manage Departments | F10 | PER-04 |
| SM-10.5 | US-10.5 Manage Department-Category Associations | F10 | PER-04 |
| SM-10.6 | US-10.6 Configure Category Email Template Overrides | F10 | PER-04 |
| SM-11.1 | US-11.1 Create and Edit Person Record | F11 | PER-04 |
| SM-11.2 | US-11.2 Manage Email Addresses for a Person | F11 | PER-04 |
| SM-11.3 | US-11.3 Manage Phone and Address Records | F11 | PER-04 |
| SM-11.4 | US-11.4 Search for a Person | F11 | PER-03 |
| SM-11.5 | US-11.5 View Staff Users List | F11 | PER-04 |
| SM-11.6 | US-11.6 Create and Revoke API Client Credentials | F11 | PER-04 |

> **R2 Complete Journey Test:** PER-01 can see their submitted ticket on the geo-cluster map. PER-02 receives email notifications within 5 minutes for every ticket lifecycle event and can search and filter tickets. PER-03 can find duplicates via in-page Solr search and upload/view field photos. PER-04 can create a fully configured service category in under 10 minutes, manage all staff accounts, and provision API client credentials immediately.

---
