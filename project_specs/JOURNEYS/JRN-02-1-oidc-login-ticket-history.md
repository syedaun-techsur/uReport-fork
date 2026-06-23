## PER-02: Priya Nair — Authenticated Resident

---

### JRN-02.1: OIDC Login and Personal Ticket History

**Persona:** PER-02 (Priya Nair)
**Scenario:** Priya logs in on a weekday evening to check whether the broken streetlight she reported two weeks ago has been assigned. She uses the city's OIDC identity provider (the same credentials she uses for her parking permit), lands on her personal ticket dashboard, filters her history, and checks the ticket status. She also notices that she received an email notification earlier that day — she wants to verify it matches what the system shows.
**Related Jobs:** JTBD-02.1, JTBD-02.2

---

#### Journey Stages

| Stage | Action | Touchpoint | Thinking | Feeling | Pain Point | Opportunity |
|---|---|---|---|---|---|---|
| **1. Initiate Login** | Navigates to the city portal; clicks "Sign In"; is redirected to the city IdP login page | Portal login page → OIDC authorization redirect (F4) | "I use this same login for my parking permit — at least I don't need a separate password" | Mildly impatient | The redirect to the IdP can feel like leaving the site — users sometimes think the login failed | Show a "You're being redirected to the city's secure sign-in page" interstitial with a recognizable city logo to reassure Priya she's in the right flow |
| **2. Authenticate** | Enters city credentials at the IdP; completes any MFA prompt; is redirected back to uReport callback URL | City OIDC IdP → callback `GET /auth/callback` (F4) | "Hope this doesn't time out — last time I had to start over after the MFA step" | Tense | If the OIDC state/nonce cookie is lost mid-flow (e.g., ad blocker clears cookies), the callback fails with an opaque error | Preserve OIDC state/nonce across the redirect correctly; show a user-friendly "Something went wrong with sign-in — please try again" page with a retry button on callback error |
| **3. Land on Dashboard** | Post-login page loads; Priya sees her personal ticket history list (most recent first) | Personal ticket dashboard (F1, F2, F4) | "Okay — I can see my tickets. There's the streetlight one. What's the status now?" | Relieved, focused | If the dashboard shows all city tickets instead of only hers, she has to search — the old system had this bug | Scope the post-login landing page to `reportedByPerson_id = current user` by default; show ticket count ("Your 4 open requests") in the page header |
| **4. Filter and Find** | Clicks "Open" status filter; scans the short list for "Streetlight" category; opens the ticket | Ticket list with status filter (F1, F5) | "There it is — still 'Open', assigned to Dana K. At least someone is looking at it" | Cautiously satisfied | Filter controls are small on tablet — Priya occasionally mis-taps the wrong filter; no debounce means rapid taps fire duplicate queries | Larger tap targets on tablet breakpoints; optimistic UI for filter changes; Solr filter applies in ≤ 200ms (NFR-6) |
| **5. Verify Notification** | Checks the ticket detail page; compares last-modified timestamp to the email she received at 2:14 PM | Ticket detail page + email inbox (F1, F7) | "The email said it was assigned at 2:14 PM. The ticket shows the same time. Good — they match" | Satisfied, trusting | In the legacy system, email timestamps sometimes lagged the ticket timestamp by hours — created distrust | Ensure email is triggered synchronously with the `ticketHistory` write, logged in `sentNotifications` with matching timestamp; display `sentNotifications` in the ticket audit trail for staff context |

---

#### Key Moments

- **Decision Point:** Stage 3 — if Priya's dashboard shows all public tickets instead of her personal history, she loses trust immediately and falls back to manual record-keeping (spreadsheet or screenshots)
- **Risk of Abandonment:** Stage 2 — OIDC callback failure (state/nonce mismatch) with no recovery path causes Priya to abandon login entirely
- **Delight Opportunity:** Stage 5 — when the email notification timestamp exactly matches the audit trail, Priya gains confidence in the system's reliability; this converts a skeptical legacy user into a regular one

---

#### Success Outcome

Priya accesses her personal ticket history within 2 clicks of logging in via OIDC, sees real-time ticket status, and can verify it matches her email notification (JTBD-02.1 success measure: personal ticket history within 2 clicks; JTBD-02.2: email notification within 5 minutes).

---

#### Feature Touchpoints

| Stage | Features |
|---|---|
| Initiate Login | F4 (OIDC initiation), F2 (RBAC public level) |
| Authenticate | F4 (OIDC callback, session creation), F2 |
| Land on Dashboard | F1 (ticket list scoped to reporter), F4 (authenticated session), F2 |
| Filter and Find | F1 (status filter), F5 (Solr query) |
| Verify Notification | F1 (ticket detail, audit trail), F7 (email notification + sentNotifications log) |

---

