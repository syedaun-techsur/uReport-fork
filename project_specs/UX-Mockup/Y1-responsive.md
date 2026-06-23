## Responsive Considerations

### Breakpoints

| Name | Range | Primary Use Case |
|------|-------|-----------------|
| Mobile | < 768px | Anonymous citizens (Marcus) submitting via phone |
| Tablet | 768px – 1024px | Authenticated residents (Priya) checking status |
| Desktop | > 1024px | Staff (Dana, Robert) in daily queue workflows |

---

### Desktop (> 1024px)

**Layout:** Two-column layouts for detail pages (content + sidebar). Three-panel layouts where applicable (filter sidebar + main + actions).

**Key screens:**
- **Staff Ticket Queue (SCR-06):** Full table with all columns visible; filter bar horizontal across the top; bulk action bar at bottom.
- **Staff Ticket Detail (SCR-07):** Two-column — ticket details and history on the left; actions panel + reporter info on the right. Sticky right column as user scrolls history.
- **Category Admin (SCR-09):** Two-column — edit form on left; live preview panel on right.
- **Search (SCR-08):** Three-column — facet sidebar (left, ~240px); results (center, flex); format switcher (right, ~200px).
- **Metrics Dashboard (SCR-13):** 4-column KPI card row; full-width sparkline chart; two-column breakdown tables.

---

### Tablet (768px – 1024px)

**Layout:** Condensed two-column on most pages; some panels stack to single column.

**Key adjustments:**
- **Staff Ticket Queue:** Filter bar collapses to a "Filters" button that opens a drawer. Table shows: ID, Category, Status, SLA only (other columns hidden with horizontal scroll or column picker). Bulk checkboxes remain.
- **Staff Ticket Detail:** Actions panel stacks below ticket details (not side-by-side). Right sidebar content moves below main content.
- **Public Submission Form:** Map is full-width at ~400px height. Step form takes full width.
- **Search:** Facet panel collapses to a "Filter" button; opens as a drawer overlay.
- **Filter controls:** Tap targets minimum 44×44px (WCAG 2.5.5 AAA / 44px recommendation). Priya's pain point (JRN-02.1 Stage 4) specifically addressed with larger tap targets.

---

### Mobile (< 768px)

**Layout:** Single-column. All sidebars become drawers or collapsible sections. Navigation collapses to hamburger menu.

**Key adjustments:**
- **Anonymous Submission Form (SCR-01):** Priority screen for mobile. Steps are full-screen cards, one per viewport. "Use my location" button is large and prominent (minimum 48px height). Map fills the viewport. Photo upload uses native file picker.
- **Confirmation (SCR-02):** Token displayed in very large monospace text. Copy button is 48px minimum. Email input is full-width.
- **Public Ticket Detail (SCR-03):** Single column: status badge, details, map (collapsed by default), history timeline.
- **Staff Queue (SCR-06):** Simplified card view replaces table. Each card shows: ID, category, status, SLA. Tap card to open detail. Filter drawer accessible via FAB (floating action button) or top filter icon.
- **Staff Ticket Detail (SCR-07):** Actions panel at top (sticky) with collapsed state. Comment/reply text areas full-width. History timeline as an accordion.
- **Navigation:** Hamburger menu; role-appropriate navigation items. Staff admin links behind a secondary "Admin" section.

**Mobile-specific affordances:**
- GPS "Use my location" auto-triggers on the location step (Step 2) if browser supports it, saving the user from typing an address.
- Native image picker for photo upload (no drag-and-drop on mobile).
- Confirmation token copy button uses native share sheet on mobile (`navigator.share()` if available; clipboard fallback).
- Form inputs use appropriate `inputmode` attributes: `inputmode="decimal"` for lat/lon, `inputmode="email"` for email fields, `inputmode="numeric"` for SLA days.

---

### Touch-Specific Interaction Rules

| Interaction | Desktop | Mobile/Tablet |
|------------|---------|---------------|
| Hover tooltips | On hover | Long-press (or tap-info icon) |
| Dropdown menus | Click to open | Tap to open; tap outside to close |
| Map pin drag | Mouse drag | Touch drag |
| Bulk select (queue) | Checkbox click | Tap checkbox; swipe to select range |
| Sidebar panels | Inline visible | Drawer overlay (slide in from right) |
| Table scroll | No horizontal scroll (responsive columns) | Horizontal swipe on card view |

---

### Performance Considerations by Breakpoint

- **Mobile:** Skeleton screens are especially important — mobile networks (3G/LTE) make the 200ms target harder to hit. Show skeletons immediately; content populates as data loads.
- **Map rendering:** On mobile, the map loads after the form step is reached (lazy load), not on initial page load.
- **Photo uploads:** On mobile, limit preview thumbnail generation to the client side before upload; do not re-request thumbnails from the server to confirm upload until the step is completed.
- **Solr search:** ≤500ms target applies to all breakpoints. Debounce search-on-type at 300ms to prevent excess requests on mobile keyboards.
