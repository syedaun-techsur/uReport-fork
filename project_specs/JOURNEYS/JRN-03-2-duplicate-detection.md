---

### JRN-03.2: Mark a Ticket as Duplicate and Link to Parent

**Persona:** PER-03 (Dana Kowalski)
**Scenario:** Dana is processing her queue mid-morning when she opens a ticket: "Water pooling at corner of Elm & 3rd." She has a vague memory of a similar report from last week. Before closing it as a duplicate, she needs to search for the parent ticket in-app, confirm the match, link the tickets, and close with sub-status "Duplicate" — all without navigating away from the current ticket detail page.
**Related Jobs:** JTBD-03.3

---

#### Journey Stages

| Stage | Action | Touchpoint | Thinking | Feeling | Pain Point | Opportunity |
|---|---|---|---|---|---|---|
| **1. Identify Candidate** | Opens the ticket "Water pooling at Elm & 3rd"; reads description and location fields; suspects it is a duplicate of a ticket she saw last Thursday | Ticket detail page (F1) | "This sounds exactly like the one I processed Thursday. Let me check before I close it wrong — marking it Bogus when it's a real Duplicate would be unfair" | Careful, uncertain | No visual indicator on the ticket that similar tickets exist nearby — there is no "possible duplicate" suggestion | Auto-surface a "Similar tickets" panel on ticket detail using Solr similarity query (same category + proximity); flag tickets with matching location + category submitted within 7 days |
| **2. Search for Parent** | Clicks "Search for duplicate" button on the ticket detail; types "elm water pooling" in the search field; adds category = "Drainage" filter | Duplicate search panel within ticket detail (F5, F1) | "It should return within a second or two — if it spins too long I'll just open a new tab" | Impatient, determined | In the legacy workflow, Dana had to open a second browser tab to search because there was no in-page search; she then copy-pasted ticket IDs back manually | In-page Solr search panel returns results in ≤ 500ms (JTBD-03.3 hiring criteria); results appear inline without navigation |
| **3. Review Matches** | Solr returns 2 results; Dana opens the first result in a side panel; confirms it matches ("Water pooling at Elm & 3rd — submitted 2026-06-17, still open") | Inline search results + ticket preview panel (F5, F1) | "That's the one. Same location, same category, same description essentially. I'm confident this is a duplicate" | Confident | Results show ticket IDs but not a quick-view preview — Dana has to click into each result to confirm details | Show a ticket snippet in the search results (category, address, submission date, current status) so Dana can confirm the match without opening a full detail view |
| **4. Link as Duplicate** | Clicks "Link as duplicate of #84609" button in the search panel; confirms the action in the dialog | Duplicate link action → `parent_id` assignment (F1, F15) | "Linking this as duplicate of 84609. This should log to both tickets' history" | Decisive | No confirmation showing what will happen on both the child and parent ticket — Dana is uncertain whether the parent reporter gets notified | Show a confirmation dialog: "This will mark ticket #84712 as a duplicate of #84609 and log a 'duplicate' action on both. The original reporter will not be notified separately." |
| **5. Close as Duplicate** | Selects sub-status "Duplicate" from the dropdown; enters close notes "Duplicate of #84609 — water pooling at Elm & 3rd"; clicks "Close Ticket" | Ticket close form with substatus_id = Duplicate (F1, F15, F7) | "Done. Both tickets have the audit trail entry now. I can move on" | Relieved, efficient | Close form doesn't pre-populate the sub-status after a duplicate link action — Dana has to select "Duplicate" manually even though she just linked the ticket | After `parent_id` is assigned, pre-select sub-status "Duplicate" in the close form as a default (user can still override) |

---

#### Key Moments

- **Decision Point:** Stage 3 — if Solr results don't return quickly or don't include enough context (ticket snippet), Dana guesses or falls back to the browser-tab workaround, undermining the in-page search investment
- **Risk of Abandonment:** Stage 2 — if the in-page search panel doesn't exist and Dana must open a new tab, the duplicate workflow is no better than the legacy system
- **Delight Opportunity:** Stage 4/5 — auto-linking and pre-selecting "Duplicate" sub-status after the link action reduces two manual steps to zero, making the close workflow feel seamlessly connected

---

#### Success Outcome

Dana confirms or rules out a duplicate within 30 seconds using in-app search, links the duplicate via `parent_id`, and closes with sub-status "Duplicate" — with `ticketHistory` entries on both the child and parent ticket, all without leaving the ticket detail page (JTBD-03.3 success measure).

---

#### Feature Touchpoints

| Stage | Features |
|---|---|
| Identify Candidate | F1 (ticket detail), F5 (potential similarity suggestion) |
| Search for Parent | F5 (Solr in-page search panel), F1 |
| Review Matches | F5 (search results), F1 (ticket preview) |
| Link as Duplicate | F1 (parent_id assignment), F15 (duplicate action reference), ticketHistory on both tickets |
| Close as Duplicate | F1 (close action), F15 (substatus_id = Duplicate), F7 (notification trigger) |

---

