---

## Y1: REST API Endpoints Catalog

All endpoints support format negotiation via URL suffix (`.json`, `.xml`, `.csv`, `.txt`) or `Accept` header (see F03). Permission annotations use `[anon]`, `[public]`, `[staff]`. All staff endpoints return `403` for non-staff authenticated users and `401` for unauthenticated callers.

---

### §Open311: GeoReport v2 Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/open311/v2/services[.json\|.xml]` | `[anon]` | List visible service categories |
| GET | `/open311/v2/services/:id[.json\|.xml]` | `[anon]` | Single service definition with attributes |
| POST | `/open311/v2/requests[.json\|.xml]` | `[api_key]` | Submit new service request |
| GET | `/open311/v2/requests[.json\|.xml]` | `[anon]` | Query service requests with filters |
| GET | `/open311/v2/requests/:id[.json\|.xml]` | `[anon]` | Single service request |
| GET | `/open311/v2/tokens/:token[.json\|.xml]` | `[anon]` | Look up request ID by token |

**POST /open311/v2/requests** — request body (form-encoded or JSON):
```
api_key          required  string
service_code     required  integer
lat              cond.     float
long             cond.     float
address_string   cond.     string
description               string
first_name                string
last_name                 string
email                     string
phone                     string
attribute[{code}]         string   (repeating, for custom fields)
media_url                 string
address_id                integer
device_id                 string   (ignored)
jurisdiction_id           string   (ignored)
```

**POST /open311/v2/requests** — success response (200):
```json
[{
  "service_request_id": 12345,
  "token": "a3f2...uuid",
  "service_notice": "",
  "account_id": ""
}]
```

**GET /open311/v2/requests** — query parameters:
```
status                    string   "open" or "closed"
service_code              integer
service_request_id        string   comma-separated IDs
start_date                string   ISO 8601
end_date                  string   ISO 8601
lat                       float
long                      float
radius                    integer  meters
page                      integer  default 1
page_size                 integer  default 100, max 500
jurisdiction_id           string   ignored
```

---

### §Auth: OIDC Authentication Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/auth/login` | `[anon]` | Initiate OIDC authorization code flow |
| GET | `/auth/callback` | `[anon]` | OIDC callback — exchange code for tokens |
| GET | `/auth/logout` | `[public]` | Destroy session, redirect to IdP end-session |
| GET | `/account` | `[public]` | View own people record |
| PUT | `/account` | `[public]` | Update own people record |

---

### §Tickets: Ticket Lifecycle Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/tickets` | `[anon]` | List tickets (filtered by role visibility) |
| POST | `/tickets` | `[public]` | Create ticket |
| GET | `/tickets/:id` | `[anon]` | View ticket detail |
| PUT | `/tickets/:id` | `[staff]` | Update ticket fields |
| POST | `/tickets/:id/assign` | `[staff]` | Assign ticket |
| POST | `/tickets/:id/close` | `[staff]` | Close ticket |
| POST | `/tickets/:id/duplicate` | `[staff]` | Mark as duplicate |
| POST | `/tickets/:id/reopen` | `[staff]` | Re-open closed ticket |
| POST | `/tickets/:id/comment` | `[staff]` | Add comment |
| POST | `/tickets/:id/response` | `[staff]` | Add response action |
| GET | `/tickets/:id/history` | `[anon]` | View ticket history (role-filtered) |

**GET /tickets** — query parameters:
```
status          string
category_id     integer
department_id   integer
person_id       integer   (assigned or reported by)
start_date      string    ISO 8601
end_date        string    ISO 8601
page            integer
page_size       integer   default 25, max 500
```

**POST /tickets** — request body:
```json
{
  "category_id": 5,
  "issueType_id": 1,
  "description": "Large pothole at Main and 3rd",
  "location": "Main St & 3rd Ave",
  "city": "Bloomington",
  "state": "IN",
  "zip": "47401",
  "latitude": 39.165,
  "longitude": -86.526,
  "contactMethod_id": 3,
  "customFields": "{\"pothole_size\": \"large\"}"
}
```

**POST /tickets/:id/close** — request body:
```json
{
  "substatus_id": 1,
  "notes": "Repaired on 2024-01-20"
}
```

**POST /tickets/:id/duplicate** — request body:
```json
{
  "parent_id": 12300
}
```

---

### §Media: Attachment Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/tickets/:id/media` | `[anon]` | List attachments for ticket |
| POST | `/tickets/:id/media` | `[public]` | Upload attachment (multipart/form-data) |
| GET | `/tickets/:id/media/:mediaId` | `[anon]` | Stream attachment file |
| GET | `/tickets/:id/media/:mediaId/thumbnail` | `[anon]` | Stream thumbnail (images only) |
| DELETE | `/tickets/:id/media/:mediaId` | `[staff]` | Delete attachment |

---

### §Search: Solr Search Endpoint

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/search` | `[anon]` | Full-text search with facets |

**GET /search** — query parameters:
```
q               string    full-text query (default: *)
status          string
category_id     integer
department_id   integer
assignedPerson_id integer
start_date      string    ISO 8601
end_date        string    ISO 8601
sort            string    "relevance" (default) or "date"
page            integer   default 1
rows            integer   default 25, max 500
```

---

### §Categories: Category Admin Endpoints

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
| GET | `/categories/:id/actions/:actionId/response` | `[staff]` | Get action response |
| POST | `/categories/:id/actions/:actionId/response` | `[staff]` | Upsert action response |
| DELETE | `/categories/:id/actions/:actionId/response` | `[staff]` | Delete action response |

---

### §Departments: Department Admin Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/departments` | `[anon]` | List departments |
| POST | `/departments` | `[staff]` | Create department |
| GET | `/departments/:id` | `[anon]` | View department |
| PUT | `/departments/:id` | `[staff]` | Update department |
| DELETE | `/departments/:id` | `[staff]` | Delete department |
| GET | `/departments/:id/categories` | `[staff]` | List department–category associations |
| POST | `/departments/:id/categories` | `[staff]` | Add category association |
| DELETE | `/departments/:id/categories/:catId` | `[staff]` | Remove category association |
| GET | `/departments/:id/actions` | `[staff]` | List department–action associations |
| POST | `/departments/:id/actions` | `[staff]` | Add action association |
| DELETE | `/departments/:id/actions/:actionId` | `[staff]` | Remove action association |

---

### §People: People & Client Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/people` | `[staff]` | List people |
| POST | `/people` | `[staff]` | Create person |
| GET | `/people/:id` | `[staff]` | View person |
| PUT | `/people/:id` | `[staff]` | Update person |
| DELETE | `/people/:id` | `[staff]` | Delete person |
| GET | `/people/search` | `[staff]` | Search people by name/email |
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

### §Clients: API Client Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/clients` | `[staff]` | List API clients |
| POST | `/clients` | `[staff]` | Create client |
| GET | `/clients/:id` | `[staff]` | View client |
| PUT | `/clients/:id` | `[staff]` | Update client |
| DELETE | `/clients/:id` | `[staff]` | Delete client |

---

### §Bookmarks: Bookmark Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/bookmarks` | `[public]` | List own bookmarks |
| POST | `/bookmarks` | `[public]` | Create bookmark |
| DELETE | `/bookmarks/:id` | `[public]` | Delete own bookmark |

---

### §Locations: Geo-Cluster Map Endpoint

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/locations` | `[anon]` | Cluster data for map rendering |

---

### §Reports: Reporting Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/metrics` | `[staff]` | Dashboard aggregate metrics |
| GET | `/reports` | `[staff]` | Exportable ticket report with filters |

---

### §ReferenceData: Sub-Status, Actions, Issue Types, Contact Methods

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/substatus` | `[staff]` | List sub-statuses |
| POST | `/substatus` | `[staff]` | Create sub-status |
| PUT | `/substatus/:id` | `[staff]` | Update sub-status |
| DELETE | `/substatus/:id` | `[staff]` | Delete sub-status |
| GET | `/actions` | `[staff]` | List actions |
| POST | `/actions` | `[staff]` | Create department action |
| PUT | `/actions/:id` | `[staff]` | Update action (template/replyEmail only for system) |
| DELETE | `/actions/:id` | `[staff]` | Delete department action |
| GET | `/issue-types` | `[staff]` | List issue types |
| POST | `/issue-types` | `[staff]` | Create issue type |
| PUT | `/issue-types/:id` | `[staff]` | Update issue type |
| DELETE | `/issue-types/:id` | `[staff]` | Delete issue type |
| GET | `/contact-methods` | `[anon]` | List contact methods |
| POST | `/contact-methods` | `[staff]` | Create contact method |
| PUT | `/contact-methods/:id` | `[staff]` | Update contact method |
| DELETE | `/contact-methods/:id` | `[staff]` | Delete contact method |
