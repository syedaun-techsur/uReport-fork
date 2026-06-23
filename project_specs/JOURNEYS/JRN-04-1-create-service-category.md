## PER-04: Robert Osei — Department Supervisor / System Admin

---

### JRN-04.1: Create a New Service Category with Custom Fields and SLA

**Persona:** PER-04 (Robert Osei)
**Scenario:** The city is launching a new "Illegal Dumping" reporting service. Robert needs to create a new category with a custom field ("Estimated dump volume in bags"), set the SLA to 5 business days, assign it to the Sanitation department, set posting permission level to "anonymous" (so any citizen can report without an account), configure a custom reply email, and publish it — all without involving a developer. He needs the category to be live for citizen submissions within the hour.
**Related Jobs:** JTBD-04.1

---

#### Journey Stages

| Stage | Action | Touchpoint | Thinking | Feeling | Pain Point | Opportunity |
|---|---|---|---|---|---|---|
| **1. Navigate to Admin** | Logs in; navigates to Admin → Categories → "New Category" | Admin navigation → category creation form (F10, F2) | "Let me make sure I'm in the right department. I don't want to accidentally publish under Public Works" | Systematic, slightly cautious | Admin navigation is not prominently linked from the main nav — Robert has bookmarked the URL because it's buried 3 levels deep | Surface an "Admin" top-level nav item for staff users with admin role; breadcrumb trail shows Department → Categories → New |
| **2. Fill Core Fields** | Enters name "Illegal Dumping", selects group "Environment", selects department "Sanitation", sets `active = true`, sets `featured = false` | Category form — core fields (F10) | "Name, group, department — straightforward. Do I need a description for the citizen-facing form? Yes, I should write one so Marcus knows what to report here" | Focused | No character count or preview of how the category name will appear to citizens in the Open311 `GET /services` response | Show a live preview panel: "How this category will appear in the citizen-facing form and Open311 API response" updating as Robert types |
| **3. Configure Permissions and SLA** | Sets `displayPermissionLevel = anonymous`, `postingPermissionLevel = anonymous`; sets `slaDays = 5`; sets `notificationReplyEmail = sanitation@city.gov` | Category form — permission, SLA, notification fields (F10, F7, F2) | "Anonymous posting means Marcus can report without logging in. Is that right for this category? Yes. And 5-day SLA seems right for dumping" | Deliberate | The permission level field labels are technical ("postingPermissionLevel") not plain English — Robert sometimes has to re-read the help text | Relabel as "Who can view this category?" (Public / Authenticated Residents / Staff Only) and "Who can submit reports?" with plain-English descriptions; add a tooltip linking to the RBAC documentation |
| **4. Add Custom Field** | Clicks "Add Custom Field"; selects type "Text"; enters label "Estimated volume (e.g., 3 bags, 1 truckload)"; marks as optional | Custom field editor (F10) | "One custom field should be enough. Can I preview how this will look on the submission form?" | Curious, slightly uncertain | Custom fields are defined as raw JSON in the legacy system — Robert had to ask a developer to validate the JSON schema | Provide a form-builder UI for custom fields (label, type, required/optional, placeholder) that generates the JSON schema behind the scenes; include a live preview of the resulting form field |
| **5. Save and Validate** | Clicks "Save Category"; system validates all required fields; shows a green success banner; category is immediately available in `GET /open311/v2/services` | Category save → validation + RBAC enforcement (F10, F2, F0) | "No errors — that's a relief. In the old system I'd get a silent failure and have to ask IT to check the database" | Relieved, satisfied | In the legacy system, saving an incomplete category caused a silent failure (no validation feedback, no error message) with citizens seeing a broken form | All required fields validated before save with inline field-level error messages; on success, show: "Category 'Illegal Dumping' is now live. Citizens can submit reports immediately." |
| **6. Verify Live** | Opens the city portal in a new incognito tab; navigates to "Report an Issue"; confirms "Illegal Dumping" appears in the category list with correct description and the custom field renders | Citizen-facing form → `GET /open311/v2/services` (F0, F10) | "There it is — 'Illegal Dumping'. The custom field looks right. I'll test a submission too to be sure" | Confident, thorough | No "Preview as citizen" mode in the admin UI — Robert has to manually open an incognito session to verify citizen-facing rendering | Add a "Preview as citizen" button in the admin UI that opens a sandboxed preview of the submission form in a modal, without actually publishing a test ticket |

---

#### Key Moments

- **Decision Point:** Stage 3 — setting the wrong `postingPermissionLevel` (e.g., `staff` instead of `anonymous`) makes the category invisible to citizens; the plain-language label is critical for correctness
- **Risk of Abandonment:** Stage 5 — silent save failure (as in legacy system) causes Robert to assume the category is live when it isn't; citizen submissions fail silently for hours until someone notices
- **Delight Opportunity:** Stage 4 — a form-builder UI for custom fields (vs. raw JSON) is the single most impactful upgrade for Robert's workflow; it removes a developer dependency entirely

---

#### Success Outcome

Robert creates a fully valid service category — with custom fields, SLA, permission levels, and notification overrides — in under 10 minutes, with validation on save, and the category is immediately live for citizen submissions with zero developer involvement (JTBD-04.1 success measure).

---

#### Feature Touchpoints

| Stage | Features |
|---|---|
| Navigate to Admin | F10 (category admin), F2 (staff RBAC gate) |
| Fill Core Fields | F10 (category creation form) |
| Configure Permissions & SLA | F10 (permission levels, slaDays), F7 (notificationReplyEmail), F2 (RBAC enforcement) |
| Add Custom Field | F10 (customFields JSON schema), F1 (custom field rendering on ticket form) |
| Save and Validate | F10 (save + validation), F2 (RBAC immediate enforcement), F0 (category appears in GET /services) |
| Verify Live | F0 (`GET /open311/v2/services`), F10 |

---

