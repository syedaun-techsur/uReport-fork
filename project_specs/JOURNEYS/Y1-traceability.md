---

## Journey-to-JTBD Traceability

| Journey | Stage | JTBD-ID | Expected Outcome from JTBD |
|---|---|---|---|
| JRN-01.1 | 1. Discover | JTBD-01.1 | Zero authentication prompts for anonymous-eligible categories |
| JRN-01.1 | 2. Select Category | JTBD-01.1 | Clear category selection with plain-language descriptions, not internal jargon |
| JRN-01.1 | 3. Locate Issue | JTBD-01.1 | Accepts location input (GPS coordinates) from a mobile browser |
| JRN-01.1 | 4. Describe & Attach | JTBD-01.1 | Accepts an optional photo attachment alongside the description |
| JRN-01.1 | 5. Submit | JTBD-01.1 | First-time user completes submission in under 3 minutes, with zero auth prompts |
| JRN-01.1 | 6. Confirm | JTBD-01.1 | Returns a unique confirmation token immediately after submission |
| JRN-01.2 | 1. Discover Services | JTBD-01.1 | Open311 `GET /services` response byte-compatible with PHP implementation (NFR-1) |
| JRN-01.2 | 2. Submit Request | JTBD-01.1 | `POST /open311/v2/requests` authenticates via api_key and creates ticket |
| JRN-01.2 | 3. Receive Token | JTBD-01.1 | Token and service_request_id returned in response envelope |
| JRN-01.2 | 4. Poll for Status | JTBD-01.2 | Token lookup returns ticket status in ≤ 200ms without authentication |
| JRN-01.2 | 5. Query Nearby | JTBD-01.3 | Anonymous geo-filtered request list loads in ≤ 200ms; only anonymous-level tickets returned |
| JRN-02.1 | 1. Initiate Login | JTBD-02.1 | OIDC login flow identical to original (NFR-11) |
| JRN-02.1 | 2. Authenticate | JTBD-02.1 | OIDC callback correctly validates state/nonce; session created |
| JRN-02.1 | 3. Land on Dashboard | JTBD-02.1 | Personal ticket history reachable within 2 clicks of login |
| JRN-02.1 | 4. Filter and Find | JTBD-02.1 | Ticket list filterable by status and date; Solr returns results in ≤ 200ms |
| JRN-02.1 | 5. Verify Notification | JTBD-02.2 | Email notification sent within 5 minutes of status change; logged in sentNotifications |
| JRN-02.2 | 1. Run the Search | JTBD-02.3 | Authenticated user can see "Save this search" affordance on Solr results page |
| JRN-02.2 | 2. Review Results | JTBD-02.3 | Solr search returns results filtered by permission level and query params |
| JRN-02.2 | 3. Save Bookmark | JTBD-02.3 | Bookmark saved from search results page without navigating away |
| JRN-02.2 | 4. Confirm Saved | JTBD-02.3 | Bookmark appears in user's dashboard |
| JRN-02.2 | 5. Re-Run Bookmark | JTBD-02.3 | Re-running bookmark replays exact Solr query and reflects current ticket state |
| JRN-03.1 | 1. Login and Orient | JTBD-03.1 | OIDC session persists through full shift; ticket list accessible immediately post-login |
| JRN-03.1 | 2. Triage Overdue | JTBD-03.1 | Queue of 500 tickets loads in ≤ 200ms; SLA sort surfaces overdue items at top |
| JRN-03.1 | 3. Assign New Ticket | JTBD-03.2 | Assignment action logged to ticketHistory with person_id |
| JRN-03.1 | 4. Update Staff Comment | JTBD-03.2 | Staff comment logged to ticketHistory; not visible to anonymous or public users (RBAC) |
| JRN-03.1 | 5. Close Resolved Ticket | JTBD-03.2 | Ticket closure produces ticketHistory entry with sub-status, close notes, and triggered notification |
| JRN-03.1 | 6. Bulk Export | JTBD-03.2 | CSV export column-for-column identical to HTML view (F3 parity) |
| JRN-03.2 | 1. Identify Candidate | JTBD-03.3 | Ticket detail surfaces potential duplicate signals (same category + location proximity) |
| JRN-03.2 | 2. Search for Parent | JTBD-03.3 | In-page Solr search returns results in ≤ 500ms; no tab-switching required |
| JRN-03.2 | 3. Review Matches | JTBD-03.3 | Search results include ticket snippet (category, address, date, status) for quick confirmation |
| JRN-03.2 | 4. Link as Duplicate | JTBD-03.3 | parent_id assignment available from ticket detail; ticketHistory entries on both child and parent |
| JRN-03.2 | 5. Close as Duplicate | JTBD-03.3 | Close with sub-status Duplicate; reporter notification triggered per F7 configuration |
| JRN-04.1 | 1. Navigate to Admin | JTBD-04.1 | Admin navigation accessible to staff role; breadcrumb trail visible |
| JRN-04.1 | 2. Fill Core Fields | JTBD-04.1 | Category creation form with all required fields; plain-language descriptions |
| JRN-04.1 | 3. Configure Permissions & SLA | JTBD-04.1 | Permission levels enforce immediately on save; no developer action required |
| JRN-04.1 | 4. Add Custom Field | JTBD-04.1 | Custom field definable via UI (no raw JSON editing); previewed before save |
| JRN-04.1 | 5. Save and Validate | JTBD-04.1 | All required fields validated before save; no silent failures; category live immediately |
| JRN-04.1 | 6. Verify Live | JTBD-04.1 | Category appears in `GET /open311/v2/services` immediately after save |
| JRN-04.2 | 1. Check Metrics Dashboard | JTBD-04.2 | Metrics dashboard reflects ticket state with ≤ 5-minute staleness |
| JRN-04.2 | 2. Open Graylog | JTBD-04.3 | Structured logs accessible in Graylog within 2 minutes; `_api_key` field present on auth failures |
| JRN-04.2 | 3. Identify Root Cause | JTBD-04.3 | Admin actions (client deletion) logged with actor person_id; surfaced in Graylog |
| JRN-04.2 | 4. Create New API Client | JTBD-04.3 | New api_key immediately usable for POST /open311/v2/requests; no restart required |
| JRN-04.2 | 5. Verify and Communicate | JTBD-04.2, JTBD-04.3 | Dashboard reflects submission rate recovery; Graylog shows 201 responses on new key |

---

*JOURNEYS generated: 2026-06-23 | Derived from PERSONAS-uReport.md, JTBD-uReport.md, PRD-uReport.md | Model: claude-sonnet-4-6*
