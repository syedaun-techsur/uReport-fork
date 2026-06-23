## Flow 00: Anonymous Ticket Submission (FLW-01)

**Trigger:** Citizen navigates to the city portal from a search result or direct link.
**User Stories:** US-1.1, US-0.3, US-2.1
**Personas:** PER-01 (Marcus Webb — Anonymous Citizen)
**Journey Reference:** JRN-01.1

```
[Landing Page]
    │
    ▼
[Category Selection]
    │  ← GET /open311/v2/services (anonymous-visible only)
    │
    ▼
[Location Step]
    │  GPS auto-detect OR manual address entry
    │
    ├── GPS success ──▶ [Map with confirmed pin + street address]
    │
    └── GPS denied  ──▶ [Manual address entry fallback]
    │
    ▼
[Description + Photo Step]
    │  Description text + optional photo upload
    │
    ▼
[Review & Submit]
    │  POST /open311/v2/requests
    │
    ├── Success ──▶ [Confirmation Screen: token + ticket ID]
    │
    └── Error   ──▶ [Inline error + retry affordance]
```

### Steps

1. **Landing Page** — "No account needed" headline above the fold. CTA button "Report an Issue" prominently in hero area. Brief note: "Your report will be reviewed within [X] business days."

2. **Category Selection** — Grid or list of categories grouped by citizen-recognizable topic (e.g., "Roads & Sidewalks", "Sanitation"). Each category shows icon, plain-language name, and one-sentence description. Search-within-categories input for long lists. If selected category requires authentication (`postingPermissionLevel = 'public'`), prompt to sign in.

3. **Location Step** — "Use my location" button auto-detects GPS coordinates. Map preview shows pin; resolved street address displayed below map for user verification. "Adjust pin" allows manual drag. Fallback: address text input. Character-count helper and nearest-intersection hint.

4. **Description + Photo Step** — Text area with placeholder "Be specific: size, exact corner, nearest landmark." Optional photo upload labeled "Optional — helps us locate the issue faster." File type and size validation inline (max 10 MB, image/PDF/doc). Character count shown (target ≤ 4000).

5. **Review & Submit** — Summary of: category name, address, description snippet, attached file (if any). "Submit Report" primary button. Submitting shows spinner with "Sending your report…"; timeout message after 5 seconds.

6. **Confirmation** — Ticket ID and token displayed prominently. Copy-to-clipboard button on token. "Send to email" optional input (anonymous users may provide email to receive confirmation). "Add to phone calendar" link. Estimated review time shown. Link to token-lookup status page.

### States

| State | UI Treatment |
|-------|-------------|
| Loading categories | Skeleton card grid (3 placeholder rows) |
| GPS locating | Spinner on map, "Finding your location…" |
| GPS failed | Red banner "Location unavailable. Please enter your address." |
| File uploading | Progress bar with filename; cancel button |
| File too large | Inline error: "File exceeds 10 MB limit" |
| Wrong file type | Inline error: "Accepted types: JPG, PNG, GIF, PDF, DOC, DOCX, TXT" |
| Submitting | Full-width spinner bar + "Sending your report…" |
| Submit success | Green confirmation page, token in highlighted box |
| Submit error (500) | "Something went wrong. Your report was not sent. Please try again." + retry button |
| Submit error (400) | Inline field-level validation messages |
| Category requires auth | "Sign in to submit to this category" banner with Sign In button |
