## PER-01: Marcus Webb — Anonymous Citizen

---

### JRN-01.1: Anonymous Service Request via Web Form

**Persona:** PER-01 (Marcus Webb)
**Scenario:** Marcus is standing at a cracked sidewalk near his home. He pulls out his phone, navigates to the city's service request portal, and submits a pothole report with GPS coordinates and a photo — all without creating an account. He wants confirmation the city received his report before he walks away.
**Related Jobs:** JTBD-01.1, JTBD-01.2

---

#### Journey Stages

| Stage | Action | Touchpoint | Thinking | Feeling | Pain Point | Opportunity |
|---|---|---|---|---|---|---|
| **1. Discover** | Searches "report pothole [city name]" on mobile browser; taps city portal link | Browser search → city portal landing page (F0) | "I hope I don't have to make an account just to report this" | Cautiously hopeful | Past experience with city forms requiring registration creates anxiety before the page even loads | Display a prominent "No account needed" message above the fold on the landing page |
| **2. Select Category** | Scans available service categories; reads descriptions to find "Pothole / Pavement Damage" | Service categories list — `GET /open311/v2/services` (F0, F2) | "Which one is right? 'Pavement Management' or 'Street Maintenance'? The names are confusing" | Mildly frustrated | Category names use internal department jargon rather than plain citizen language | Display plain-language category descriptions and group categories by citizen-recognizable topic (e.g., "Roads & Sidewalks") |
| **3. Locate Issue** | Taps "Use my location" button; reviews map pin placement; adjusts pin slightly | Location picker with GPS auto-detect (F0, F9) | "Is the pin in the right spot? I want them to find the right place" | Focused, slightly uncertain | Mobile GPS accuracy varies — pin sometimes lands 20 metres off; no visual confirmation of address | Show resolved street address below the map pin so Marcus can verify location before continuing |
| **4. Describe & Attach** | Types a brief description ("Large pothole on corner of Main & Oak, about 30cm wide"); taps photo icon and uploads a picture from camera roll | Ticket submission form — description field, file upload (F1, F8) | "Should I add more detail? Is a photo required?" | Engaged, slightly unsure | No inline guidance on what makes a good description; unclear whether photo is optional | Provide an inline character count tip ("Be specific: size, exact corner, nearest landmark") and label photo field "Optional — helps us locate the issue faster" |
| **5. Submit** | Reviews the form summary and taps "Submit Report" | Form submit → `POST /open311/v2/requests` (F0, F1, F2) | "I hope this actually goes through — the last time I tried a city form it just spun forever" | Anxious | Mobile network latency can make the submission feel hung; no optimistic UI feedback | Show an immediate in-progress spinner with "Sending your report…" and a timeout message if the response takes more than 5 seconds |
| **6. Confirm** | Reads confirmation screen showing ticket ID and token; optionally copies or screenshots token | Confirmation page — submission token returned in response (F0, F1) | "Good, it says reference number 84721. Should I write this down? I'll probably forget it" | Relieved, but slightly worried about losing the token | Token is shown once with no email option for anonymous users — if Marcus closes the tab, the token is gone | Offer "Add to phone calendar" or "Send to email" options on the confirmation screen; display token prominently with a copy-to-clipboard button |

---

#### Key Moments

- **Decision Point:** Category selection (Stage 2) — if Marcus can't find the right category within 15 seconds, he abandons the form
- **Risk of Abandonment:** Submit stage (Stage 5) — a slow or silent failure response causes Marcus to tap away and call the city's phone line instead
- **Delight Opportunity:** Confirmation stage (Stage 6) — a confirmation screen that makes the token easy to save (clipboard copy, email option) turns an anxious interaction into a satisfied one; bonus if it shows "Your report will be reviewed within X business days"

---

#### Success Outcome

Marcus completes a service request submission from landing page to confirmation token in under 3 minutes, with zero authentication prompts, on a mobile browser (JTBD-01.1 success measure: ≤ 3 minutes, zero auth prompts).

---

#### Feature Touchpoints

| Stage | Features |
|---|---|
| Discover | F0 (Open311 API — services list), F2 (RBAC anonymous level) |
| Select Category | F0 (`GET /open311/v2/services`), F2 (displayPermissionLevel = anonymous) |
| Locate Issue | F0 (lat/lon fields), F9 (geo-clustering map view) |
| Describe & Attach | F1 (ticket creation), F8 (media upload) |
| Submit | F0 (`POST /open311/v2/requests`), F1, F2 |
| Confirm | F0 (token response), F1 (ticket record created) |

---

