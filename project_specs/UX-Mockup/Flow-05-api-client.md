## Flow 05: API Client Credential Rotation (FLW-06)

**Trigger:** Supervisor receives report of 403 errors from a third-party API consumer; navigates to diagnose and fix.
**User Stories:** US-11.6, US-0.3
**Personas:** PER-04 (Robert Osei — Department Supervisor)
**Journey Reference:** JRN-04.2

```
[Metrics Dashboard — SCR-13]
    │  Submission rate sparkline shows drop-off at 9:07 AM
    │
    ▼
[Admin → API Clients — SCR-11]
    │  Table: name, URL, api_key (masked), contact person, created date
    │
    ├── Find deleted client ──▶ [Client not in list; need to recreate]
    │
    └── Click "New API Client"
            │
            ▼
        [API Client Form]
            │  Name, URL, Contact Person (people search), Contact Method
            │  Generate API Key button ──▶ Auto-generates 50-char key
            │
            ▼
        [Save]
            │  api_key unique validation
            │
            ├── Duplicate key ──▶ [Error: "API key already exists. Regenerate."]
            │
            └── Save success ──▶ [Client list with new client]
                                     │
                                     ▼
                                 [Copy api_key to clipboard]
                                 [Share with integrator]
```

### Sub-Flow: Edit Existing Client

```
[Client List] → [Click client name] → [Client Edit Form]
    │  All fields pre-populated; api_key shown masked (••••xxxx)
    │  "Regenerate Key" button creates a new api_key immediately
    │
    └── Regenerate ──▶ [Confirmation: "Old key will stop working immediately."]
                            │
                            └── Confirm ──▶ [New key displayed; copy button shown]
```

### Steps

1. **Metrics Dashboard Context** — Supervisor notices submission rate drop in sparkline. Navigates to Admin → API Clients to investigate.

2. **API Client List** — Table showing: client name, URL, masked api_key (last 4 chars visible), contact person name, date created. Actions per row: Edit, Delete. "New API Client" button in page header.

3. **New Client Form** — Fields:
   - **Name** (required): short identifier for the integrator
   - **URL** (optional): integrator's application URL
   - **Contact Person** (required): people search autocomplete; must reference existing `people` record
   - **Contact Method** (optional): dropdown of `contactMethods` reference data
   - **API Key**: auto-generated on form load (can regenerate). Full key shown on this screen only — masked afterward.

4. **Key Generation** — "Generate API Key" button creates a new cryptographically random 50-char key. The key is shown in full in a read-only input with a copy-to-clipboard button. Warning: "Copy this key now — it will only be shown once in full."

5. **Save** — `api_key` uniqueness validated server-side. Duplicate returns HTTP 409 with inline error. On success, the new client is immediately usable — no restart required (live DB lookup on every `POST /open311/v2/requests`).

6. **Revoke / Delete** — Delete button on client row. Confirmation dialog: "Deleting this client will immediately invalidate the API key. Any integrator using this key will receive 403 errors." Clients referenced by existing tickets (`tickets.client_id`) return HTTP 409 and cannot be deleted.

### States

| State | UI Treatment |
|-------|-------------|
| Client list loading | Skeleton table |
| Empty client list | "No API clients configured. [Add First Client]" |
| API key on creation | Full key in copyable input; copy button; one-time-show warning |
| API key on edit | Masked: "••••••••••••••••••••••••••••••••••••••••••••xxxx" |
| Regenerate confirmation | Modal with clear warning about immediate key invalidation |
| Save in progress | Submit spinner; form locked |
| Duplicate key error | Inline: "This API key already exists. Click 'Generate' for a new one." |
| Delete blocked (tickets exist) | Error toast: "This client has associated tickets and cannot be deleted." |
| New key works immediately | No restart needed; confirmation message states this |
