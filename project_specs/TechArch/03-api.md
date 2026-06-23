---

## 4. API Design

### 4.1 Global API Conventions

- **Base URL:** `/` (configurable; no `/api/v1` prefix except for Open311 which uses `/open311/v2/`)
- **Format negotiation:** URL suffix > `?format=` > `Accept` header > default (JSON for Open311, HTML elsewhere)
- **Authentication:** Session cookie (`HttpOnly`, `Secure`, `SameSite=Lax`); Open311 POST uses `api_key` body param
- **Authorization:** CASL guard per route — `[anon]`, `[public]`, `[staff]`, `[api_key]`
- **Validation:** `class-validator` DTOs with `ValidationPipe` (global); HTTP 400 on failure
- **Pagination:** `page` (1-based) + `page_size` params; wrapped in `{total, page, pageSize, results}` envelope (non-Open311)
- **Error envelope:**
  ```json
  { "statusCode": 404, "error": "Not Found", "message": "Service request not found" }
  ```
- **Timestamps:** ISO 8601 UTC strings in all JSON/XML responses

---

### 4.2 TypeScript Interfaces

#### Core Domain Types

```typescript
// ---- Enums ----

type PermissionLevel = 'anonymous' | 'public' | 'staff';
type TicketStatus   = 'open' | 'closed';
type ActionType     = 'system' | 'department';
type SubstatusStatus = 'open' | 'closed';

// ---- People ----

interface Person {
  id: number;
  firstname: string | null;
  middlename: string | null;
  lastname: string | null;
  organization: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  department_id: number | null;
  username: string | null;
  role: string | null;
}

interface PersonEmail {
  id: number;
  person_id: number;
  email: string;
  label: 'Home' | 'Work' | 'Other';
  usedForNotifications: boolean;
}

interface PersonPhone {
  id: number;
  person_id: number;
  number: string | null;
  label: 'Main' | 'Mobile' | 'Work' | 'Home' | 'Fax' | 'Pager' | 'Other';
}

interface PersonAddress {
  id: number;
  person_id: number;
  address: string;
  city: string | null;
  state: string | null;
  zip: string | null;
  label: 'Home' | 'Business' | 'Rental';
}

// ---- Categories ----

interface Category {
  id: number;
  name: string;
  description: string | null;
  department_id: number;
  defaultPerson_id: number | null;
  categoryGroup_id: number | null;
  active: boolean | null;
  featured: boolean | null;
  displayPermissionLevel: PermissionLevel;
  postingPermissionLevel: PermissionLevel;
  customFields: string | null;      // JSON string
  lastModified: string;             // ISO 8601
  slaDays: number | null;
  notificationReplyEmail: string | null;
  autoCloseIsActive: boolean | null;
  autoCloseSubstatus_id: number | null;
}

interface CategoryGroup {
  id: number;
  name: string;
  ordering: number | null;
}

// ---- Departments ----

interface Department {
  id: number;
  name: string;
  defaultPerson_id: number | null;
}

// ---- Tickets ----

interface Ticket {
  id: number;
  parent_id: number | null;
  category_id: number | null;
  issueType_id: number | null;
  client_id: number | null;
  enteredByPerson_id: number | null;
  reportedByPerson_id: number | null;
  assignedPerson_id: number | null;
  contactMethod_id: number | null;
  responseMethod_id: number | null;
  enteredDate: string;              // ISO 8601
  lastModified: string;             // ISO 8601
  addressId: number | null;
  latitude: number | null;
  longitude: number | null;
  location: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  status: TicketStatus;
  closedDate: string | null;        // ISO 8601
  substatus_id: number | null;
  additionalFields: string | null;
  customFields: string | null;      // JSON string
  description: string | null;
}

interface TicketHistoryEntry {
  id: number;
  ticket_id: number;
  enteredByPerson_id: number | null;
  actionPerson_id: number | null;
  action_id: number;
  enteredDate: string;              // ISO 8601
  actionDate: string;               // ISO 8601
  notes: string | null;
  data: string | null;              // JSON string
  sentNotifications: string | null; // comma-separated emails
}

// ---- Media ----

interface MediaAttachment {
  id: number;
  ticket_id: number;
  filename: string;
  internalFilename: string;
  mime_type: string | null;
  uploaded: string;                 // ISO 8601
  person_id: number | null;
}

// ---- Reference Data ----

interface Substatus {
  id: number;
  name: string;
  description: string;
  status: SubstatusStatus;
  isDefault: boolean;
}

interface Action {
  id: number;
  name: string;
  description: string;
  type: ActionType;
  template: string | null;
  replyEmail: string | null;
}

interface IssueType {
  id: number;
  name: string;
}

interface ContactMethod {
  id: number;
  name: string;
}

interface Client {
  id: number;
  name: string;
  url: string | null;
  api_key: string;
  contactPerson_id: number;
  contactMethod_id: number | null;
}

interface Bookmark {
  id: number;
  person_id: number;
  type: string;
  name: string | null;
  requestUri: string;
}

// ---- Open311 GeoReport v2 ----

interface Open311Service {
  service_code: number;
  service_name: string;
  description: string;
  metadata: boolean;
  type: 'realtime';
  keywords: string;
  group: string;
}

interface Open311ServiceAttribute {
  variable: boolean;
  code: string;
  datatype: 'string' | 'number' | 'datetime' | 'singlevaluelist' | 'multivaluelist';
  required: boolean;
  datatype_description: string;
  order: number;
  description: string;
  values?: Array<{ key: string; name: string }>;
}

interface Open311ServiceDefinition extends Open311Service {
  attributes: Open311ServiceAttribute[];
}

interface Open311ServiceRequest {
  service_request_id: number;
  status: TicketStatus;
  status_notes: string;
  service_name: string;
  service_code: number;
  description: string;
  agency_responsible: string;
  service_notice: string;
  requested_datetime: string;       // ISO 8601
  updated_datetime: string;         // ISO 8601
  expected_datetime: string | null; // ISO 8601
  address: string;
  address_id: string;
  zipcode: string;
  lat: number | null;
  long: number | null;
  media_url: string | null;
}

interface Open311SubmitResponse {
  service_request_id: number;
  token: string;
  service_notice: string;
  account_id: string;
}

interface Open311TokenResponse {
  token: string;
  service_request_id: number;
}

// ---- Session ----

interface SessionData {
  userId?: number;
  role?: string | null;
  state?: string;      // ephemeral: OIDC state
  nonce?: string;      // ephemeral: OIDC nonce
  returnTo?: string;   // ephemeral: post-login redirect
}

// ---- Search ----

interface SearchResult {
  total: number;
  page: number;
  rows: number;
  results: SolrTicketDocument[];
  facets: {
    categories: Array<{ id: number; name: string; count: number }>;
    statuses:   Array<{ value: string; count: number }>;
    departments: Array<{ id: number; name: string; count: number }>;
  };
}

interface SolrTicketDocument {
  id: number;
  status: string;
  description: string | null;
  category_id: number;
  category_name: string;
  department_id: number;
  department_name: string;
  assignedPerson_id: number | null;
  enteredDate: string;
  lastModified: string;
  location: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  substatus_id: number | null;
  substatus_name: string | null;
  issueType_id: number | null;
  customFields: string | null;
}
```

---

### 4.3 REST Endpoint Catalog

#### §Open311 — GeoReport v2

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/open311/v2/services[.json\|.xml]` | `[anon]` | List visible service categories |
| GET | `/open311/v2/services/:id[.json\|.xml]` | `[anon]` | Service definition with attributes |
| POST | `/open311/v2/requests[.json\|.xml]` | `[api_key]` | Submit new service request |
| GET | `/open311/v2/requests[.json\|.xml]` | `[anon]` | Query service requests |
| GET | `/open311/v2/requests/:id[.json\|.xml]` | `[anon]` | Single service request |
| GET | `/open311/v2/tokens/:token[.json\|.xml]` | `[anon]` | Look up request ID by token |

#### §Auth — OIDC

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/auth/login` | `[anon]` | Initiate OIDC auth code flow (302 redirect) |
| GET | `/auth/callback` | `[anon]` | OIDC callback — exchange code, provision user |
| GET | `/auth/logout` | `[public]` | Destroy session, redirect |
| GET | `/account` | `[public]` | View own people record |
| PUT | `/account` | `[public]` | Update own people record |

#### §Tickets — Lifecycle

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/tickets` | `[anon]` | List tickets (role-filtered) |
| POST | `/tickets` | `[public]` | Create ticket |
| GET | `/tickets/:id` | `[anon]` | View ticket detail |
| PUT | `/tickets/:id` | `[staff]` | Update ticket fields |
| POST | `/tickets/:id/assign` | `[staff]` | Assign ticket to person |
| POST | `/tickets/:id/close` | `[staff]` | Close ticket with substatus |
| POST | `/tickets/:id/duplicate` | `[staff]` | Mark as duplicate of parent |
| POST | `/tickets/:id/reopen` | `[staff]` | Re-open closed ticket |
| POST | `/tickets/:id/comment` | `[staff]` | Add staff comment |
| POST | `/tickets/:id/response` | `[staff]` | Add response action |
| GET | `/tickets/:id/history` | `[anon]` | View ticket history (role-filtered) |

#### §Media — Attachments

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/tickets/:id/media` | `[anon]` | List attachments |
| POST | `/tickets/:id/media` | `[public]` | Upload attachment (multipart/form-data) |
| GET | `/tickets/:id/media/:mediaId` | `[anon]` | Stream attachment |
| GET | `/tickets/:id/media/:mediaId/thumbnail` | `[anon]` | Stream thumbnail |
| DELETE | `/tickets/:id/media/:mediaId` | `[staff]` | Delete attachment |

#### §Search — Solr

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/search` | `[anon]` | Full-text search with facets |

#### §Categories

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/categories` | `[anon]` | List categories (role-filtered) |
| POST | `/categories` | `[staff]` | Create category |
| GET | `/categories/:id` | `[anon]` | View category |
| PUT | `/categories/:id` | `[staff]` | Update category |
| DELETE | `/categories/:id` | `[staff]` | Delete category |
| GET | `/category-groups` | `[anon]` | List category groups |
| POST | `/category-groups` | `[staff]` | Create group |
| PUT | `/category-groups/:id` | `[staff]` | Update group |
| DELETE | `/category-groups/:id` | `[staff]` | Delete group |
| GET | `/categories/:id/actions/:actionId/response` | `[staff]` | Get action response template |
| POST | `/categories/:id/actions/:actionId/response` | `[staff]` | Upsert action response |
| DELETE | `/categories/:id/actions/:actionId/response` | `[staff]` | Delete action response |

#### §Departments

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/departments` | `[anon]` | List departments |
| POST | `/departments` | `[staff]` | Create department |
| GET | `/departments/:id` | `[anon]` | View department |
| PUT | `/departments/:id` | `[staff]` | Update department |
| DELETE | `/departments/:id` | `[staff]` | Delete department |
| GET | `/departments/:id/categories` | `[staff]` | List department-category links |
| POST | `/departments/:id/categories` | `[staff]` | Add category link |
| DELETE | `/departments/:id/categories/:catId` | `[staff]` | Remove category link |
| GET | `/departments/:id/actions` | `[staff]` | List department-action links |
| POST | `/departments/:id/actions` | `[staff]` | Add action link |
| DELETE | `/departments/:id/actions/:actionId` | `[staff]` | Remove action link |

#### §People & Clients

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/people` | `[staff]` | List people |
| POST | `/people` | `[staff]` | Create person |
| GET | `/people/:id` | `[staff]` | View person |
| PUT | `/people/:id` | `[staff]` | Update person |
| DELETE | `/people/:id` | `[staff]` | Delete person |
| GET | `/people/search` | `[staff]` | Search by name/email |
| GET | `/users` | `[staff]` | List staff accounts |
| POST | `/people/:id/emails` | `[staff]` | Add email |
| PUT | `/people/:id/emails/:emailId` | `[staff]` | Update email |
| DELETE | `/people/:id/emails/:emailId` | `[staff]` | Delete email |
| POST | `/people/:id/phones` | `[staff]` | Add phone |
| PUT | `/people/:id/phones/:phoneId` | `[staff]` | Update phone |
| DELETE | `/people/:id/phones/:phoneId` | `[staff]` | Delete phone |
| POST | `/people/:id/addresses` | `[staff]` | Add address |
| PUT | `/people/:id/addresses/:addrId` | `[staff]` | Update address |
| DELETE | `/people/:id/addresses/:addrId` | `[staff]` | Delete address |
| GET | `/clients` | `[staff]` | List API clients |
| POST | `/clients` | `[staff]` | Create client |
| GET | `/clients/:id` | `[staff]` | View client |
| PUT | `/clients/:id` | `[staff]` | Update client |
| DELETE | `/clients/:id` | `[staff]` | Delete client |

#### §Bookmarks

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/bookmarks` | `[public]` | List own bookmarks |
| POST | `/bookmarks` | `[public]` | Create bookmark |
| DELETE | `/bookmarks/:id` | `[public]` | Delete own bookmark |

#### §Locations

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/locations` | `[anon]` | Cluster data for map rendering |

#### §Reports

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/metrics` | `[staff]` | Dashboard aggregate metrics |
| GET | `/reports` | `[staff]` | Exportable report (all 5 formats) |

#### §Reference Data

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/substatus` | `[staff]` | List sub-statuses |
| POST | `/substatus` | `[staff]` | Create sub-status |
| PUT | `/substatus/:id` | `[staff]` | Update sub-status |
| DELETE | `/substatus/:id` | `[staff]` | Delete sub-status |
| GET | `/actions` | `[staff]` | List actions |
| POST | `/actions` | `[staff]` | Create department action |
| PUT | `/actions/:id` | `[staff]` | Update action |
| DELETE | `/actions/:id` | `[staff]` | Delete department action |
| GET | `/issue-types` | `[staff]` | List issue types |
| POST | `/issue-types` | `[staff]` | Create issue type |
| PUT | `/issue-types/:id` | `[staff]` | Update issue type |
| DELETE | `/issue-types/:id` | `[staff]` | Delete issue type |
| GET | `/contact-methods` | `[anon]` | List contact methods |
| POST | `/contact-methods` | `[staff]` | Create contact method |
| PUT | `/contact-methods/:id` | `[staff]` | Update contact method |
| DELETE | `/contact-methods/:id` | `[staff]` | Delete contact method |
