---

### JRN-01.2: Open311 API — Programmatic Submit and Query

**Persona:** PER-01 (Marcus Webb) — as proxy for the API machine actor (third-party mobile app or city portal calling Open311 on Marcus's behalf)
**Scenario:** Marcus is using a third-party city services mobile app that calls the Open311 GeoReport v2 API directly. The app submits Marcus's report via `POST /open311/v2/requests`, then looks up the ticket status later using the returned token. Marcus's experience is mediated entirely by the app — but the correctness of the API response determines whether the app works at all.
**Related Jobs:** JTBD-01.1, JTBD-01.2

> **Note:** This journey maps the API machine actor's interaction sequence, using Marcus as the human beneficiary proxy. Pain points and opportunities describe API behavior that the app developer must handle and that Marcus will experience indirectly.

---

#### Journey Stages

| Stage | Action | Touchpoint | Thinking | Feeling | Pain Point | Opportunity |
|---|---|---|---|---|---|---|
| **1. Discover Services** | App calls `GET /open311/v2/services` to populate a category picker | Open311 `GET /open311/v2/services` (F0, F3) | "Are the service codes the same as yesterday? Did the city add new categories?" | Neutral (app developer perspective); Marcus just sees a category list | If the response schema changes (even whitespace or field ordering), the app may parse incorrectly | Response must be byte-compatible with the PHP implementation (NFR-1); content-type negotiated correctly (`Accept: application/json`) |
| **2. Submit Request** | App calls `POST /open311/v2/requests` with `api_key`, `service_code`, `lat`, `long`, `description`, `media_url` | Open311 `POST /open311/v2/requests` (F0, F1, F2) | "Did the request go through? Did I get a token?" | Anxious (Marcus waits for the app to confirm) | `api_key` authentication failure returns a cryptic 403 with no message; missing required fields return inconsistent error shapes | Return structured error bodies with `code` and `description` fields matching GeoReport v2 error envelope on all 4xx responses |
| **3. Receive Token** | App parses the JSON/XML response; extracts `token` and `service_request_id`; displays confirmation to Marcus | Open311 `POST /open311/v2/requests` response envelope (F0, F3) | "The app says 'Report submitted — reference #84721'. I'll screenshot that" | Relieved | Some GeoReport v2 responses include `token` only; the app must handle both `token` and `service_request_id` in the same response | Ensure response always includes both `token` and `service_request_id` (or `token` + a `GET /tokens/:token` lookup) per spec; format negotiation via `.json` suffix must work |
| **4. Poll for Status** | App calls `GET /open311/v2/tokens/:token` to resolve token to request ID; then calls `GET /open311/v2/requests/:id` for current status | Open311 `GET /open311/v2/tokens/:token` and `GET /open311/v2/requests/:id` (F0) | "Is the ticket still open? Has anyone been assigned to it?" | Moderately curious; Marcus checks the app two days later | No push notifications from the Open311 spec — the app must poll; polling frequency is up to the app | Response time ≤ 200ms (NFR-6) for token lookup and single-ticket fetch ensures polling is low-overhead |
| **5. Query Nearby Tickets** | App calls `GET /open311/v2/requests?lat=X&long=Y&radius=Z&status=open` to show Marcus other nearby open reports | Open311 `GET /open311/v2/requests` with geo params (F0, F2, F9) | "Are there other reports near my house? The app shows a map with red dots" | Curious, reassured that the city is tracking issues | Results include tickets from multiple categories — Marcus may not understand why some appear; RBAC must filter PII fields | `displayPermissionLevel = anonymous` filter applied server-side — PII fields (reporter name, email) must be absent; geo-cluster map endpoint provides pre-computed clusters for efficient map rendering |

---

#### Key Moments

- **Decision Point:** Stage 2 — if `POST /open311/v2/requests` returns a format deviation from the PHP response (even field order), the mobile app may silently fail to parse the token and Marcus never sees a confirmation
- **Risk of Abandonment:** Stage 3 — if the response envelope omits the `token` field or uses a different key name, the app crashes; Marcus uninstalls the app
- **Delight Opportunity:** Stage 5 — a fast geo-filtered request list (≤ 200ms) enables the app to show a live "nearby issues" map, giving Marcus social context that his neighborhood is being served

---

#### Success Outcome

Every Open311 API response from the new Node.js implementation is byte-identical to the PHP implementation on the same input fixtures, ensuring zero changes are required by external API consumers (NFR-1, NFR-2; JTBD-01.1 and JTBD-01.2 success measures fulfilled through the API channel).

---

#### Feature Touchpoints

| Stage | Features |
|---|---|
| Discover Services | F0 (`GET /open311/v2/services`), F3 (content negotiation) |
| Submit Request | F0 (`POST /open311/v2/requests`), F1, F2 (api_key + RBAC) |
| Receive Token | F0 (response envelope), F3 (JSON/XML format) |
| Poll for Status | F0 (`GET /open311/v2/tokens/:token`, `GET /open311/v2/requests/:id`) |
| Query Nearby | F0 (`GET /open311/v2/requests` geo params), F2, F9 |

---

