---

## Cross-Journey Patterns

### Common Pain Points Across Multiple Journeys

| Pattern | Journeys Affected | Root Cause | Shared Opportunity |
|---|---|---|---|
| **Legacy system unreliability creates distrust** — users build shadow workarounds (Excel sheets, screenshots, browser tabs) because they can't trust the system | JRN-01.1, JRN-03.1, JRN-03.2, JRN-04.1 | PHP legacy system: page timeouts, silent save failures, inconsistent notification triggers | The re-platform's primary value proposition is eliminating these workarounds; every journey that removes a workaround should be highlighted in the launch communication |
| **No optimistic UI / feedback on async actions** — form submissions, saves, and searches feel "stuck" when the server takes > 500ms | JRN-01.1 (Stage 5), JRN-02.1 (Stage 2), JRN-03.1 (Stage 2) | Network latency + no client-side loading states | Implement loading spinners, skeleton screens, and toast confirmations consistently across all form submit and filter actions |
| **Notification trust gap** — multiple personas have been burned by missed or delayed notifications in the legacy system | JRN-02.1 (Stage 5), JRN-03.1 (Stage 5), JRN-03.2 (Stage 5) | PHPMailer + inconsistent trigger logic in the legacy system | Every email send must be logged synchronously to `ticketHistory.sentNotifications` with a timestamp; surface the send log in the ticket audit trail for both staff and authenticated citizens |
| **Discoverability gaps** — features like "Save this search" (bookmarks), admin navigation, and "possible duplicate" suggestions are invisible to users who need them | JRN-02.2 (Stage 1), JRN-03.2 (Stage 1), JRN-04.1 (Stage 1) | Feature-first UI design without progressive disclosure or contextual prompts | Conduct a UI audit for all "hidden feature" affordances after re-platform; add contextual tooltips or inline prompts at the moments journeys show users need them |
| **RBAC correctness is a cross-cutting anxiety** — Dana worries about accidentally showing internal comments to citizens; Robert worries about wrong permission levels on categories | JRN-03.1 (Stage 4), JRN-04.1 (Stage 3) | Laminas ACL edge cases + unclear UI labeling | Clear visual distinction for staff-only vs. public-visible elements (lock icons, color-coded labels); CASL rule set must exactly match Laminas ACL with test coverage (NFR-7) |

---

### Shared Opportunities That Could Be Solved Once

1. **Unified loading state component** — a single NestJS interceptor measuring response time + a front-end loading state library applied globally would address the "stuck form" pattern across all journeys without per-page implementation.

2. **Structured GELF fields as a contract** — defining a fixed set of GELF structured fields (`_user_id`, `_ticket_id`, `_api_key`, `_http_status`, `_admin_action`) once in the GELF logging service (F14) serves both Robert's diagnostic journey (JRN-04.2) and the overall NFR-8 observability requirement.

3. **Audit trail as the source of truth for notifications** — if every `ticketHistory` write atomically triggers notification evaluation (F7), and every sent notification is logged back to `ticketHistory.sentNotifications`, then Priya's notification trust gap (JRN-02.1) and Dana's notification anxiety (JRN-03.1) are solved by the same mechanism.

4. **Permission level UI labels** — renaming `postingPermissionLevel`/`displayPermissionLevel` to plain English in the admin UI (F10) and on the citizen-facing form (F0) resolves Robert's category configuration confusion (JRN-04.1 Stage 3) and removes potential RBAC misconfiguration.

---

### Stages Where Multiple Personas Converge

| Convergence Point | Personas | Shared Mechanism |
|---|---|---|
| Ticket submission confirmation | PER-01 (JRN-01.1 Stage 6), PER-02 (JRN-02.1 Stage 3) | Both depend on the same `POST /open311/v2/requests` or authenticated ticket creation response returning a stable ticket ID and status |
| Ticket status visibility | PER-01 (JRN-01.2 Stage 4), PER-02 (JRN-02.1 Stage 4) | Both query ticket status via the Open311 API or the ticket detail page; RBAC filters the same record differently for anonymous vs. authenticated |
| Notification receipt | PER-02 (JRN-02.1 Stage 5), PER-03 (JRN-03.1 Stage 5) | Priya receives the email Dana's close action triggers; they share a single notification pipeline; correctness of one validates the other |
| Solr search results | PER-02 (JRN-02.2 Stage 2), PER-03 (JRN-03.1 Stage 2), PER-03 (JRN-03.2 Stage 2) | All three rely on the same Solr index, query construction, and ≤ 200-500ms response time requirement |

---

