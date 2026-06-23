## Interaction Patterns

### Pattern 1: Optimistic Loading States

**When to use:** Any async operation that may take >200ms — form submissions, filter changes, Solr queries, file uploads.

**Behavior:**
1. User triggers action (click, submit, type)
2. **Immediate:** UI enters loading state (spinner on button, skeleton on content area, greyed rows)
3. **In progress:** Progress indicator continues
4. **Success:** Smooth transition to result; success toast (for writes)
5. **Error:** Inline error message near the triggering element; retry affordance

**Examples across the app:**
- Filter change on ticket queue → rows greyed + spinner in filter bar
- Search query → result area shows skeleton rows
- File upload → progress bar with filename and cancel
- Close ticket → modal spinner; buttons disabled during write

**Timeout handling:**
- Submissions taking > 5 seconds: "This is taking longer than expected. Still trying…"
- After 30 seconds: "This is taking unusually long. [Retry]"

---

### Pattern 2: Toast Notifications

**When to use:** Confirmation of successful writes (assign, comment, close, save, delete). Not for errors (those go inline).

**Behavior:**
- Appear at top-right of screen
- Auto-dismiss after 5 seconds
- Manually dismissible (× button)
- Multiple toasts stack vertically
- Color coding: green (success), amber (warning), red (error — only when inline error not possible)

**Toast message convention:**
- Success: "[Entity] [action]. [Optional: 'Email sent to [address].']"
- Examples:
  - "Ticket #84712 assigned to Dana Kowalski."
  - "Ticket #84712 closed. Email sent to marcus@email.com."
  - "Category 'Illegal Dumping' saved. Changes are live."
  - "Bookmark 'Elm Street Potholes' saved. [View your bookmarks →]"

---

### Pattern 3: Confirmation Dialogs

**When to use:** Destructive or irreversible actions, or actions with external side effects (emails sent, parent ticket modified).

**Behavior:**
- Modal overlay; cannot be dismissed by clicking outside
- Summary of what will happen — not just "Are you sure?"
- Cancel button always available
- Confirm button disabled during in-progress state

**Required for:**
- Close ticket (shows recipient email)
- Mark as duplicate (shows effect on both tickets)
- Delete category / person / API client
- Regenerate API key
- Bulk assign

**Not required for:**
- Add comment (no external side effects)
- Filter changes
- Pagination

---

### Pattern 4: Inline Form Validation

**When to use:** All forms with user input.

**Behavior:**
- Validate on blur (when user leaves the field), not on every keystroke
- Show field-level error messages directly below the input
- Red border on invalid field
- Error message disappears when field becomes valid
- Submit button shows spinner and is disabled during submission
- If server returns validation errors, map them back to the corresponding field

**Common validations and messages:**
| Rule | Message |
|------|---------|
| Required | "[Field name] is required." |
| Max length | "[Field name] must be [N] characters or fewer. (X / N)" |
| Email format | "Please enter a valid email address." |
| Lat/lon range | "Latitude must be between -90 and 90." |
| Positive integer | "[Field name] must be a positive number." |
| Date format | "Please enter a date in YYYY-MM-DD format." |

---

### Pattern 5: Role-Gated Elements

**When to use:** Any UI element that should only be visible or active for specific roles.

**Behavior:**
- Anonymous users: staff-only elements are **completely hidden** (not disabled)
- Public users: staff-only actions are **completely hidden** on ticket detail
- Staff users: all elements visible; staff-only elements have visual distinction

**Visual distinction for staff-only elements:**
- Light blue background (`#eff6ff`) for staff-only panels
- 🔒 lock icon prefix for staff-only text areas / fields
- "Staff only" label badge in grey for clearly staff-exclusive sections

**Never:** Show a disabled button to non-staff with tooltip "You don't have permission." Instead, hide the element entirely to avoid confusion.

---

### Pattern 6: Multi-Format Content Switcher

**When to use:** Ticket detail, search results, reports — wherever the `SerializationInterceptor` supports multiple formats.

**Behavior:**
- A "Format" section in the sidebar or action bar
- Shows available formats as pill links: `HTML` (current, active) | `JSON` | `XML` | `CSV` | `TXT`
- Clicking JSON/XML/TXT opens in a new tab (or triggers download for CSV)
- Active format highlighted

**Placement:**
- Ticket detail: right sidebar
- Search results: header bar (or secondary nav)
- Reports: export section

---

### Pattern 7: In-Page Search Panel

**When to use:** Duplicate detection in ticket detail (FLW-04); avoids leaving the current page.

**Behavior:**
- Collapsible panel inline with the ticket detail
- Text input + filter dropdowns
- Results appear below input within ≤500ms (NFR-6)
- Each result shows a snippet (not just an ID)
- Action buttons per result (e.g., "Link as duplicate")
- Panel can be closed without affecting the main ticket form

---

### Pattern 8: Bookmarked Search Save Modal

**When to use:** From any search results page, for authenticated users only.

**Behavior:**
- Small modal overlay (not full-page navigation)
- Name input pre-populated with sanitized query + active filter summary
- Save → modal closes → results remain visible → toast confirmation
- "View your bookmarks →" link in toast for discoverability

---

### Pattern 9: SLA Elapsed Indicator

**When to use:** Ticket rows in the staff queue and ticket detail header.

**Behavior:**
- If `categories.slaDays` is set: display "X days" in the SLA column
- If elapsed days ≤ `slaDays`: plain text, no special treatment
- If elapsed days > `slaDays`: ⚠️ amber badge + amber row highlight in queue
- If `slaDays` is null on the category: SLA column shows "—"
- Tooltip on ⚠️: "SLA target: [N] days. Current: [X] days."

---

### Pattern 10: Audit Trail Timeline

**When to use:** Ticket history section in staff ticket detail and public ticket detail.

**Behavior:**
- Chronological list (oldest first, per FRD F01.9)
- Each entry: timestamp, action type label, brief description, actor name (staff-only for PII fields)
- Staff-only entries (comments) shown with 🔒 lock prefix
- Email notifications shown with ✉️ icon and "Email sent to [address]"
- Duplicate link entries show ticket ID as a clickable link
- On public view: PII fields (person names, email) are omitted; comment entries hidden entirely
