## Accessibility Notes

### Standards Target

All screens must meet **WCAG 2.1 Level AA**. Key screens used by anonymous citizens (SCR-01, SCR-02, SCR-03) should target AAA for color contrast and touch target size given the high-stress, mobile-first use context.

---

### Color Contrast

| Element | Foreground | Background | Ratio | Requirement |
|---------|-----------|-----------|-------|-------------|
| Body text | #111827 | #ffffff | 16.1:1 | ≥ 4.5:1 (AA) ✓ |
| Muted label | #6b7280 | #ffffff | 4.6:1 | ≥ 4.5:1 (AA) ✓ |
| Primary button | #ffffff | #0070f3 | 4.7:1 | ≥ 4.5:1 (AA) ✓ |
| Error text | #b91c1c | #ffffff | 5.9:1 | ≥ 4.5:1 (AA) ✓ |
| SLA warning badge | #92400e | #fef3c7 | 4.8:1 | ≥ 4.5:1 (AA) ✓ |
| Status: Open | #065f46 | #d1fae5 | 7.2:1 | ≥ 4.5:1 (AA) ✓ |
| Status: Closed | #991b1b | #fee2e2 | 5.5:1 | ≥ 4.5:1 (AA) ✓ |
| Disabled button | #9ca3af | #f3f4f6 | 2.5:1 | Exempt (disabled state) |

**Note:** Status indicators (Open/Closed) use both color AND text AND icon — never color alone.

---

### Keyboard Navigation

All interactive elements must be reachable and operable via keyboard:

| Element | Keyboard Behavior |
|---------|------------------|
| Category cards (SCR-01) | Tab to navigate; Enter/Space to select; Arrow keys within group |
| Map (SCR-01 Step 2) | Tab to reach "Use my location" button; Enter to activate. Map pin adjustable via arrow keys once focused. |
| Dropdown menus | Tab to focus; Enter/Space to open; Arrow keys to navigate options; Enter to select; Escape to close |
| Modal dialogs | Focus trapped inside modal when open; Escape closes modal; Tab cycles through modal focusable elements; first focusable element receives focus on open |
| Toast notifications | Not focusable (decorative); screen reader announcement via `aria-live` region |
| Ticket history timeline | Tab/Arrow through history entries; Enter to expand details |
| Bulk checkboxes (queue) | Tab to checkbox; Space to toggle; Shift+click for range select |
| File upload zone | Tab to focus; Enter/Space to open file picker; files also accepted via keyboard drag simulation |

**Skip link:** A "Skip to main content" link must be the first focusable element on every page. Visually hidden unless focused.

---

### Screen Reader Support

#### ARIA Labels Required

| Element | ARIA Attribute | Value |
|---------|---------------|-------|
| Status badge (Open/Closed) | `aria-label` | "Status: Open" / "Status: Closed (Resolved)" |
| SLA warning icon | `aria-label` | "SLA exceeded: [X] days elapsed, target [N] days" |
| Copy token button | `aria-label` | "Copy tracking token to clipboard" |
| Lock icon (staff comment) | `aria-hidden="true"` | Icon is decorative; label in adjacent text |
| Loading spinner | `aria-label` + `role="status"` | "Loading…" |
| Modal dialog | `role="dialog"` + `aria-modal="true"` + `aria-labelledby` | Points to modal heading |
| Map region | `aria-label` | "Interactive map showing issue location" |
| Search input | `aria-label` | "Search tickets" |
| Facet checkboxes | `aria-label` | "[Category name] ([count] results)" |
| Ticket history entries | `role="listitem"` within `role="list"` | — |
| Progress step indicator | `aria-label` per dot | "Step 1 of 4: Choose a Category (current)" |

#### Live Regions

| Region | `aria-live` | Used For |
|--------|------------|---------|
| Toast container | `aria-live="polite"` | Success/error toasts after form submits |
| Search result count | `aria-live="polite"` | "47 results for 'pothole'" |
| Filter update | `aria-live="polite"` | "Showing 23 results" after filter change |
| Save status | `aria-live="assertive"` | Only for critical errors that require immediate attention |

---

### Focus Management

| Trigger | Focus Moves To |
|---------|---------------|
| Modal opens | First focusable element inside modal |
| Modal closes | Element that triggered modal open |
| Form submission error | First field with an error |
| Toast appears | Toast itself (if `aria-live` region, no focus move needed) |
| Page navigation (SPA-style) | `<h1>` of the new page content |
| Ticket detail loads | Page `<h1>` ("Ticket #XXXXX") |
| Search results update | Result count heading ("47 results for…") |

---

### Image and Media Accessibility

| Element | Requirement |
|---------|-------------|
| Category icons | `aria-hidden="true"` if decorative; `alt` text if meaningful |
| Uploaded photos | `alt` attribute set to original filename; or description if available |
| Thumbnail images | `alt="Thumbnail for [filename]"` |
| Map | `aria-label` for the map region; address text always shown outside the map for screen readers |
| Sparkline chart (metrics) | Text fallback: "Submission rate over last 24 hours: peak at [time] with [N] submissions" |

---

### Form Accessibility

| Requirement | Implementation |
|-------------|---------------|
| All inputs have visible labels | `<label for>` or `aria-labelledby` — never `placeholder` as the only label |
| Required fields indicated | `aria-required="true"` + visible asterisk (*) + form-level legend "Fields marked * are required" |
| Error messages associated with inputs | `aria-describedby` pointing to the error `<span>` ID |
| Validation triggered on blur | Not on every keystroke — reduces noise for screen reader users |
| Autocomplete attributes | Email: `autocomplete="email"`, Name: `autocomplete="given-name"` / `autocomplete="family-name"`, Address fields use `autocomplete` appropriately |
| File upload | `<input type="file">` is always present and keyboard accessible, even if a drag-drop zone is also displayed |

---

### Touch and Pointer Accessibility

| Element | Minimum Target Size |
|---------|-------------------|
| Primary buttons | 44×44px |
| Icon-only buttons (copy, delete) | 44×44px |
| Checkboxes (queue bulk select) | 44×44px touch target (visual may be smaller) |
| Filter dropdown triggers | 44×44px |
| Map "Adjust pin" handle | 44×44px |
| Navigation links | 44px height minimum |

Pointer target size meets WCAG 2.5.5 AAA (44×44px) for all primary interactions.

---

### Internationalization Hooks

Although localization is out of scope for the re-platform, these structural requirements should be met:
- All user-visible strings should use a template/constant approach (not inline literals) to facilitate future i18n
- Date formatting should use locale-aware utilities (`Intl.DateTimeFormat`) — UTC for storage, local timezone for display
- RTL layout is not required but HTML `lang` attribute must be set on `<html>` element
- Character encoding: UTF-8 throughout, including the CSV BOM (`\xEF\xBB\xBF`) per F3 requirements
