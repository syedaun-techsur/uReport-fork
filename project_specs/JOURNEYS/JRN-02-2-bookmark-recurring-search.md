---

### JRN-02.2: Setting Up a Bookmark for a Recurring Issue Search

**Persona:** PER-02 (Priya Nair)
**Scenario:** Priya regularly checks whether new potholes have been reported on Elm Street — the road in front of her house. Each session she re-types the same search query in the Solr search box. Today she discovers the bookmark feature and decides to save "Elm Street Potholes" as a named search she can re-run with one click on future visits.
**Related Jobs:** JTBD-02.3

---

#### Journey Stages

| Stage | Action | Touchpoint | Thinking | Feeling | Pain Point | Opportunity |
|---|---|---|---|---|---|---|
| **1. Run the Search** | Types "pothole elm street" in the search box; selects "Open" status filter; clicks Search | Solr search page (F5) | "Here we go again — same query I run every week. I should save this somehow" | Mildly resigned | No visual hint that searches can be saved — the bookmark feature is not discoverable from the search form | Add a "Save this search" affordance (icon or link) in the search results header, visible only to authenticated users |
| **2. Review Results** | Scans search results: 3 open pothole tickets on Elm Street; confirms they match expectations | Solr search results page (F5, F2) | "Good, three open tickets. Same ones as last week — still no progress on the big one" | Neutral, slightly concerned about slow resolution | Results show tickets from nearby streets too — Priya has to visually scan to confirm "Elm Street" tickets | Support an `address_contains` filter or street-name facet in search; highlight matched terms in the result snippet |
| **3. Save Bookmark** | Clicks "Save this search"; a modal prompts for a name; types "Elm Street Potholes"; clicks Save | Bookmark creation modal — `POST /bookmarks` (F12) | "What should I name it? Something I'll recognize next week" | Curious, slightly uncertain | Modal appears but doesn't pre-populate a suggested name from the query string — Priya has to invent a name from scratch | Pre-populate the bookmark name field with a sanitized version of the query (e.g., "pothole elm street — Open") and let Priya edit it |
| **4. Confirm Bookmark Saved** | Modal closes; search results remain visible; a success toast appears: "Bookmark 'Elm Street Potholes' saved" | Toast notification + results page (F12) | "It saved — but where do I find it later? Is it on my profile somewhere?" | Satisfied but uncertain about retrieval | No immediate indication of where the bookmark will appear on future sessions | Toast message includes a "View your bookmarks" link; bookmarks also appear on the post-login dashboard sidebar |
| **5. Re-Run Bookmark (Next Session)** | Logs in next week; sees "Elm Street Potholes" in the saved searches panel on her dashboard; clicks it | Dashboard saved searches panel → Solr query re-executed (F5, F12, F4) | "One click and I can see the current results — this is much better than retyping it" | Pleased, efficient | If the Solr index is temporarily unavailable, the bookmark click shows an error with no context | Show a "Search is temporarily unavailable — try again in a moment" message on Solr errors rather than a generic 500; results must reflect current ticket state (not cached) |

---

#### Key Moments

- **Decision Point:** Stage 1 — if Priya doesn't see a "Save this search" affordance in the results page, she never discovers the feature; discoverability is the critical gate
- **Risk of Abandonment:** Stage 3 — if the bookmark save silently fails (no confirmation), Priya assumes it worked and discovers it's missing next session, destroying trust in the feature
- **Delight Opportunity:** Stage 5 — a one-click re-run of a named bookmark that returns current results is the product's strongest productivity win for Priya; it converts a weekly friction point into a 3-second task

---

#### Success Outcome

Priya saves a named bookmark from a Solr results page without leaving the results view and successfully re-runs it in a single click on her next session, with results reflecting current ticket state (JTBD-02.3 success measure).

---

#### Feature Touchpoints

| Stage | Features |
|---|---|
| Run the Search | F5 (Solr search), F2 (public permission filter) |
| Review Results | F5 (Solr results), F2 (displayPermissionLevel filter) |
| Save Bookmark | F12 (bookmark creation), F4 (authenticated session required) |
| Confirm Saved | F12 (bookmark stored), F5 (results page remains) |
| Re-Run Bookmark | F12 (bookmark list), F5 (Solr query re-executed), F4 (authenticated session) |

---

