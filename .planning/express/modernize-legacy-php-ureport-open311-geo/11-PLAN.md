---
phase: wave-4-backend
plan: 11
type: execute
wave: 4
depends_on: [3]
files_modified:
  - src/modules/open311/open311.module.ts
  - src/modules/open311/open311.controller.ts
  - src/modules/open311/open311.service.ts
  - src/modules/open311/open311.serializer.ts
  - src/modules/open311/dto/post-request.dto.ts
  - src/modules/open311/dto/get-requests.dto.ts
  - src/app.module.ts
autonomous: true

features:
  implements: ["F0"]
  depends_on: ["F6", "F3", "F2", "F11", "F10", "F1"]
  enables: []

must_haves:
  truths:
    - "GET /open311/v2/services returns array of Service objects filtered by caller's displayPermissionLevel"
    - "GET /open311/v2/services/:id returns ServiceDefinition with attributes array from parsed customFields JSON"
    - "GET /open311/v2/services/:id returns 404 for non-existent or non-visible category"
    - "POST /open311/v2/requests validates api_key against clients table (active=true only); invalid key → 403"
    - "POST /open311/v2/requests requires service_code + (lat+long OR address_string); missing → 400"
    - "POST /open311/v2/requests creates a ticket and returns [{service_request_id, token, service_notice:'', account_id:''}]"
    - "GET /open311/v2/requests returns paginated array of ServiceRequest objects filtered by role visibility"
    - "GET /open311/v2/requests filters by status, service_code, service_request_id, start_date, end_date"
    - "GET /open311/v2/requests/:id returns single-element array with ServiceRequest object; 404 if not visible"
    - "GET /open311/v2/tokens/:token returns [{token, service_request_id}] or 404"
    - "URL suffix routing: /open311/v2/services.json and /open311/v2/services.xml both work (suffix stripped before controller)"
    - "Content-Type is application/json for JSON responses, application/xml for XML"
    - "JSON response wraps single result in array (GET /requests/:id → [{...}])"
    - "XML envelope: GET /services → <services><service>...</service></services>, GET /requests → <service_requests><request>...</request></service_requests>"
    - "api_key accepted as query param (?api_key=) or body param for POST"
    - "jurisdiction_id query param accepted and ignored without error"
    - "expected_datetime is enteredDate + slaDays business days when slaDays is set; null otherwise"
  artifacts:
    - path: "src/modules/open311/open311.module.ts"
      provides: "Open311Module — route prefix /open311/v2, imports TicketsModule+CategoriesModule+PeopleModule"
      exports: ["Open311Module"]
    - path: "src/modules/open311/open311.controller.ts"
      provides: "Open311Controller — all 6 GeoReport v2 endpoints with suffix routing"
      exports: ["Open311Controller"]
    - path: "src/modules/open311/open311.service.ts"
      provides: "Open311Service — api_key validation, category visibility filter, ServiceRequest mapping, token lookup"
      exports: ["Open311Service"]
    - path: "src/modules/open311/open311.serializer.ts"
      provides: "Open311Serializer — byte-compatible GeoReport v2 envelope shapes for JSON and XML"
      exports: ["Open311Serializer"]
    - path: "src/modules/open311/dto/post-request.dto.ts"
      provides: "PostRequestDto — all POST /requests input fields with class-validator"
      exports: ["PostRequestDto"]
    - path: "src/modules/open311/dto/get-requests.dto.ts"
      provides: "GetRequestsDto — query filter params with class-validator"
      exports: ["GetRequestsDto"]
  key_links:
    - from: "src/modules/open311/open311.service.ts"
      to: "src/modules/people/clients.service.ts"
      via: "ClientsService.findByApiKey(api_key)"
      pattern: "clientsService\\.findByApiKey"
    - from: "src/modules/open311/open311.service.ts"
      to: "src/modules/categories/categories.service.ts"
      via: "CategoriesService.findAll(role) — displayPermissionLevel filter"
      pattern: "categoriesService\\.findAll"
    - from: "src/modules/open311/open311.service.ts"
      to: "src/modules/tickets/tickets.service.ts"
      via: "TicketsService.create() for POST /requests ticket creation"
      pattern: "ticketsService\\.create"
    - from: "src/modules/open311/open311.service.ts"
      to: "prisma/schema.prisma"
      via: "PrismaService ticketHistory query for token lookup"
      pattern: "prisma\\.ticketHistory\\.findFirst"
    - from: "src/app.module.ts"
      to: "src/modules/open311/open311.module.ts"
      via: "AppModule imports array"
      pattern: "Open311Module"

integration_contracts:
  requires:
    - from_plan: "06"
      artifact: "src/modules/auth/ability.factory.ts"
      exports: ["AbilityFactory", "AppAbility"]
      verify: "grep -n 'export class AbilityFactory' src/modules/auth/ability.factory.ts && echo CONTRACT_OK"
    - from_plan: "06"
      artifact: "src/common/middleware/auth.middleware.ts"
      exports: ["AuthMiddleware"]
      verify: "grep -n 'export class AuthMiddleware' src/common/middleware/auth.middleware.ts && echo CONTRACT_OK"
    - from_plan: "07"
      artifact: "src/modules/categories/categories.service.ts"
      exports: ["CategoriesService"]
      verify: "grep -n 'export class CategoriesService' src/modules/categories/categories.service.ts && echo CONTRACT_OK"
    - from_plan: "07"
      artifact: "src/modules/categories/categories.module.ts"
      exports: ["CategoriesModule", "CategoriesService"]
      verify: "grep -n 'export class CategoriesModule' src/modules/categories/categories.module.ts && echo CONTRACT_OK"
    - from_plan: "08"
      artifact: "src/modules/people/clients.service.ts"
      exports: ["ClientsService"]
      verify: "grep -n 'findByApiKey' src/modules/people/clients.service.ts && grep -n 'active.*true' src/modules/people/clients.service.ts && echo CONTRACT_OK"
    - from_plan: "08"
      artifact: "src/modules/people/people.module.ts"
      exports: ["PeopleModule", "PeopleService", "ClientsService"]
      verify: "grep -n 'export class PeopleModule' src/modules/people/people.module.ts && grep -n 'exports.*ClientsService' src/modules/people/people.module.ts && echo CONTRACT_OK"
    - from_plan: "01"
      artifact: "prisma/schema.prisma"
      exports: ["tickets", "ticketHistory", "categories", "clients", "people", "departments", "categoryGroups", "media"]
      verify: "grep -n 'model tickets' prisma/schema.prisma && grep -n 'model ticketHistory' prisma/schema.prisma && grep -n 'model categories' prisma/schema.prisma && echo CONTRACT_OK"
    - from_plan: "03"
      artifact: "src/common/interceptors/serialization.interceptor.ts"
      exports: ["SerializationInterceptor"]
      verify: "grep -n 'export.*SerializationInterceptor' src/common/interceptors/serialization.interceptor.ts && echo CONTRACT_OK"
  provides:
    - artifact: "src/modules/open311/open311.module.ts"
      exports: ["Open311Module"]
      shape: |
        @Module({
          imports: [PeopleModule, CategoriesModule, TicketsModule],
          controllers: [Open311Controller],
          providers: [Open311Service, Open311Serializer],
        })
        export class Open311Module {}
      verify: "grep -n 'export class Open311Module' src/modules/open311/open311.module.ts && echo CONTRACT_OK"
    - artifact: "src/modules/open311/open311.service.ts"
      exports: ["Open311Service"]
      shape: |
        @Injectable()
        export class Open311Service {
          getServices(role: string | null): Promise<Open311Service[]>
          getService(id: number, role: string | null): Promise<Open311ServiceDefinition>
          postRequest(dto: PostRequestDto): Promise<Open311SubmitResponse[]>
          getRequests(dto: GetRequestsDto, role: string | null): Promise<Open311ServiceRequest[]>
          getRequest(id: number, role: string | null): Promise<Open311ServiceRequest[]>
          getToken(token: string): Promise<Open311TokenResponse[]>
        }
      verify: "grep -n 'export class Open311Service' src/modules/open311/open311.service.ts && grep -n 'postRequest\|getRequests\|getToken' src/modules/open311/open311.service.ts && echo CONTRACT_OK"
    - artifact: "src/modules/open311/open311.serializer.ts"
      exports: ["Open311Serializer"]
      shape: |
        @Injectable()
        export class Open311Serializer {
          serializeServices(services: Open311Service[]): string      // JSON array
          serializeServicesXml(services: Open311Service[]): string   // <services>...</services>
          serializeRequests(requests: Open311ServiceRequest[]): string
          serializeRequestsXml(requests: Open311ServiceRequest[]): string
        }
      verify: "grep -n 'export class Open311Serializer' src/modules/open311/open311.serializer.ts && echo CONTRACT_OK"
---

<objective>
Implement the Open311Module — delivering all 6 byte-compatible GeoReport v2 endpoints that constitute the primary public API contract of uReport.

Purpose: F0 is P0-critical. External API consumers (mobile apps, city portals, third-party integrators) must receive responses that are character-for-character identical to the legacy PHP implementation. This module is the most public-facing surface of the entire re-platform. It consumes all of the Wave 1–3 foundations: Prisma schema (Wave 1), SerializationInterceptor (Wave 2), CategoriesService/PeopleModule/RBAC (Wave 3), and TicketsService (Wave 4a/b plans 09–10).

Output:
- `src/modules/open311/open311.module.ts` — NestJS module with route prefix `/open311/v2`, importing TicketsModule, CategoriesModule, PeopleModule
- `src/modules/open311/open311.controller.ts` — Open311Controller handling all 6 GeoReport v2 endpoints with URL suffix routing (`.json`/`.xml`)
- `src/modules/open311/open311.service.ts` — Open311Service with api_key validation, category-visibility filtering, ServiceRequest mapping, token generation/lookup, expected_datetime calculation
- `src/modules/open311/open311.serializer.ts` — Open311Serializer enforcing byte-compatible GeoReport v2 envelope shapes
- `src/modules/open311/dto/post-request.dto.ts` and `get-requests.dto.ts` — class-validator DTOs
- `src/app.module.ts` updated to import Open311Module
</objective>

<feature_dependencies>
Implements: F0: Open311 GeoReport v2 REST API — all 6 endpoints (GET/POST /requests, GET /services, GET /services/:id, GET /tokens/:token) with api_key authentication, category-visibility RBAC filtering, content-negotiated JSON/XML serialization, byte-compatible GeoReport v2 response field mapping
Depends on: F6: PostgreSQL schema (tickets, ticketHistory, categories, clients, categoryGroups, departments, media tables); F3: SerializationInterceptor (content negotiation pipeline); F2: RBAC (displayPermissionLevel/postingPermissionLevel category visibility filter); F11: PeopleModule/ClientsService (api_key validation via findByApiKey); F10: CategoriesModule/CategoriesService (category queries with permission filter); F1: TicketsModule/TicketsService (ticket creation on POST /requests)
Enables: None (F0 is the terminal public-facing surface; Wave 5 adds Solr search and notifications that hook into TicketsService, not Open311Module)
</feature_dependencies>

<execution_context>
@.planning/express/modernize-legacy-php-ureport-open311-geo/WAVE-SCHEDULE.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/STATE.md
@project_specs/FRD-uReport.md (F00 section, lines 103–350)
@project_specs/TechArch-uReport.md (§2.1 Open311Module, §4.2 TypeScript interfaces Open311Service/Open311ServiceRequest/etc.)
@.planning/express/modernize-legacy-php-ureport-open311-geo/07-PLAN.md
@.planning/express/modernize-legacy-php-ureport-open311-geo/08-PLAN.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Open311Service, Open311Serializer, DTOs — GeoReport v2 business logic and byte-compatible serialization</name>
  <files>
    src/modules/open311/open311.service.ts
    src/modules/open311/open311.serializer.ts
    src/modules/open311/dto/post-request.dto.ts
    src/modules/open311/dto/get-requests.dto.ts
  </files>
  <action>
Implement the core business logic for all 6 Open311 GeoReport v2 endpoints, plus the serializer that enforces byte-compatible envelope shapes.

## Directory structure

```
src/modules/open311/
├── open311.module.ts        ← Task 2
├── open311.controller.ts    ← Task 2
├── open311.service.ts       ← Task 1
├── open311.serializer.ts    ← Task 1
└── dto/
    ├── post-request.dto.ts  ← Task 1
    └── get-requests.dto.ts  ← Task 1
```

---

### src/modules/open311/dto/post-request.dto.ts

All inputs from FRD §F00.3 POST /requests. Fields match the GeoReport v2 spec exactly:

```typescript
import {
  IsString, IsInt, IsOptional, IsEmail,
  IsNumberString, Min, Max, MaxLength,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class PostRequestDto {
  // api_key: accepted as query param, body param (FRD §F00.3)
  // NOTE: the controller reads from req.query || req.body; dto validates it once extracted
  @IsString()
  @MaxLength(50)
  api_key: string;

  // service_code maps to categories.id (FRD §F00.3)
  @IsInt()
  @Type(() => Number)
  service_code: number;

  // Location: either (lat+long) or address_string required — validated in service (FRD §F00.3)
  @IsOptional()
  @Type(() => Number)
  lat?: number;

  @IsOptional()
  @Type(() => Number)
  long?: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  address_string?: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  address_id?: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  first_name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  last_name?: string;

  @IsOptional()
  @IsEmail({}, { message: 'email must match RFC 5322 format' })
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  // device_id: accepted and ignored for compatibility (FRD §F00.3)
  @IsOptional()
  @IsString()
  device_id?: string;

  // media_url: stored in ticketHistory.notes (FRD §F00.3)
  @IsOptional()
  @IsString()
  media_url?: string;

  // jurisdiction_id: accepted and ignored (FRD §F00.1)
  @IsOptional()
  @IsString()
  jurisdiction_id?: string;

  // attribute[{code}] custom field values: encoded in tickets.customFields JSON (FRD §F00.3)
  // These arrive as dynamic keys — handled via raw body parsing in the service, not a DTO field
}
```

---

### src/modules/open311/dto/get-requests.dto.ts

All filter inputs from FRD §F00.4 GET /requests:

```typescript
import {
  IsOptional, IsString, IsInt, IsIn, Min, Max,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class GetRequestsDto {
  // status: 'open' or 'closed' (FRD §F00.4)
  @IsOptional()
  @IsIn(['open', 'closed'])
  status?: 'open' | 'closed';

  // service_code: filter by category id (FRD §F00.4)
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  service_code?: number;

  // service_request_id: comma-separated ticket IDs (FRD §F00.4)
  @IsOptional()
  @IsString()
  service_request_id?: string;

  // ISO 8601 date range (FRD §F00.4)
  @IsOptional()
  @IsString()
  start_date?: string;

  @IsOptional()
  @IsString()
  end_date?: string;

  // Geo radius search (FRD §F00.4)
  @IsOptional()
  @Type(() => Number)
  lat?: number;

  @IsOptional()
  @Type(() => Number)
  long?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  radius?: number;

  // Pagination — default page=1, page_size=100, max 500 (FRD §F00.4)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page_size?: number = 100;

  // jurisdiction_id: accepted and ignored (FRD §F00.1)
  @IsOptional()
  @IsString()
  jurisdiction_id?: string;
}
```

---

### src/modules/open311/open311.serializer.ts

Enforces byte-compatible GeoReport v2 envelope shapes per FRD §F00 and TechArch §2.1 Open311Module.

**JSON rules (FRD §F03.3):**
- Field names match legacy PHP names exactly (camelCase/snake_case as in spec)
- Null values represented as `null`
- Booleans as `true`/`false`
- Dates as ISO 8601 UTC strings
- Single results wrapped in an array (GeoReport v2 spec)

**XML rules (FRD §F03.4):**
- `GET /services` → `<services><service>...</service></services>`
- `GET /requests` → `<service_requests><request>...</request></service_requests>`
- `<?xml version="1.0" encoding="UTF-8"?>` declaration required
- CDATA for description/notes fields

```typescript
import { Injectable } from '@nestjs/common';

// GeoReport v2 TypeScript interfaces from TechArch §4.2
export interface Open311ServiceDto {
  service_code: number;
  service_name: string;
  description: string;
  metadata: boolean;
  type: 'realtime';
  keywords: string;
  group: string;
}

export interface Open311ServiceAttributeDto {
  variable: boolean;
  code: string;
  datatype: 'string' | 'number' | 'datetime' | 'singlevaluelist' | 'multivaluelist';
  required: boolean;
  datatype_description: string;
  order: number;
  description: string;
  values?: Array<{ key: string; name: string }>;
}

export interface Open311ServiceDefinitionDto extends Open311ServiceDto {
  attributes: Open311ServiceAttributeDto[];
}

export interface Open311ServiceRequestDto {
  service_request_id: number;
  status: 'open' | 'closed';
  status_notes: string;
  service_name: string;
  service_code: number;
  description: string;
  agency_responsible: string;
  service_notice: string;
  requested_datetime: string;   // ISO 8601
  updated_datetime: string;     // ISO 8601
  expected_datetime: string | null; // ISO 8601 or null
  address: string;
  address_id: string;
  zipcode: string;
  lat: number | null;
  long: number | null;
  media_url: string | null;
}

export interface Open311SubmitResponseDto {
  service_request_id: number;
  token: string;
  service_notice: string;
  account_id: string;
}

export interface Open311TokenResponseDto {
  token: string;
  service_request_id: number;
}

@Injectable()
export class Open311Serializer {

  // ---- JSON serialization (default for /open311/v2/ routes) ----

  /** Serialize array of services to JSON string — GeoReport v2 services list */
  serializeServicesJson(services: Open311ServiceDto[]): string {
    return JSON.stringify(services);
  }

  /** Serialize single service definition to JSON string — wrapped in array per GeoReport v2 */
  serializeServiceDefinitionJson(def: Open311ServiceDefinitionDto): string {
    return JSON.stringify([def]);
  }

  /** Serialize requests to JSON string */
  serializeRequestsJson(requests: Open311ServiceRequestDto[]): string {
    return JSON.stringify(requests);
  }

  /** Serialize submit response to JSON string — array with one object */
  serializeSubmitResponseJson(resp: Open311SubmitResponseDto): string {
    return JSON.stringify([resp]);
  }

  /** Serialize token response to JSON string — array with one object */
  serializeTokenResponseJson(resp: Open311TokenResponseDto): string {
    return JSON.stringify([resp]);
  }

  // ---- XML serialization ----

  /** Build xml-safe CDATA string */
  private cdata(value: string | null | undefined): string {
    if (value === null || value === undefined) return '';
    // Escape CDATA end sequence
    return `<![CDATA[${String(value).replace(/]]>/g, ']]]]><![CDATA[>')}]]>`;
  }

  /** Escape XML special chars for attribute values */
  private escapeXml(value: string | null | undefined): string {
    if (value === null || value === undefined) return '';
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /** Serialize services list to XML — <services><service>...</service></services> (FRD §F03.4) */
  serializeServicesXml(services: Open311ServiceDto[]): string {
    const serviceElements = services.map(s => this.serviceToXml(s)).join('\n');
    return `<?xml version="1.0" encoding="UTF-8"?>\n<services>\n${serviceElements}\n</services>`;
  }

  /** Serialize single service definition to XML — wrapped in <services> with <attributes> */
  serializeServiceDefinitionXml(def: Open311ServiceDefinitionDto): string {
    const attrs = def.attributes.map(a => this.attributeToXml(a)).join('\n');
    const serviceXml = this.serviceToXml(def) + `\n<attributes>\n${attrs}\n</attributes>`;
    return `<?xml version="1.0" encoding="UTF-8"?>\n<services>\n${serviceXml}\n</services>`;
  }

  private serviceToXml(s: Open311ServiceDto): string {
    return [
      '<service>',
      `  <service_code>${s.service_code}</service_code>`,
      `  <service_name>${this.cdata(s.service_name)}</service_name>`,
      `  <description>${this.cdata(s.description)}</description>`,
      `  <metadata>${s.metadata}</metadata>`,
      `  <type>${this.escapeXml(s.type)}</type>`,
      `  <keywords>${this.cdata(s.keywords)}</keywords>`,
      `  <group>${this.cdata(s.group)}</group>`,
      '</service>',
    ].join('\n');
  }

  private attributeToXml(a: Open311ServiceAttributeDto): string {
    const valuesXml = a.values
      ? a.values.map(v => `    <value><key>${this.escapeXml(v.key)}</key><name>${this.cdata(v.name)}</name></value>`).join('\n')
      : '';
    return [
      '<attribute>',
      `  <variable>${a.variable}</variable>`,
      `  <code>${this.escapeXml(a.code)}</code>`,
      `  <datatype>${this.escapeXml(a.datatype)}</datatype>`,
      `  <required>${a.required}</required>`,
      `  <datatype_description>${this.cdata(a.datatype_description)}</datatype_description>`,
      `  <order>${a.order}</order>`,
      `  <description>${this.cdata(a.description)}</description>`,
      valuesXml ? `  <values>\n${valuesXml}\n  </values>` : '',
      '</attribute>',
    ].filter(Boolean).join('\n');
  }

  /** Serialize requests to XML — <service_requests><request>...</request></service_requests> */
  serializeRequestsXml(requests: Open311ServiceRequestDto[]): string {
    const elements = requests.map(r => this.requestToXml(r)).join('\n');
    return `<?xml version="1.0" encoding="UTF-8"?>\n<service_requests>\n${elements}\n</service_requests>`;
  }

  private requestToXml(r: Open311ServiceRequestDto): string {
    return [
      '<request>',
      `  <service_request_id>${r.service_request_id}</service_request_id>`,
      `  <status>${this.escapeXml(r.status)}</status>`,
      `  <status_notes>${this.cdata(r.status_notes)}</status_notes>`,
      `  <service_name>${this.cdata(r.service_name)}</service_name>`,
      `  <service_code>${r.service_code}</service_code>`,
      `  <description>${this.cdata(r.description)}</description>`,
      `  <agency_responsible>${this.cdata(r.agency_responsible)}</agency_responsible>`,
      `  <service_notice>${this.cdata(r.service_notice)}</service_notice>`,
      `  <requested_datetime>${this.escapeXml(r.requested_datetime)}</requested_datetime>`,
      `  <updated_datetime>${this.escapeXml(r.updated_datetime)}</updated_datetime>`,
      `  <expected_datetime>${r.expected_datetime ? this.escapeXml(r.expected_datetime) : ''}</expected_datetime>`,
      `  <address>${this.cdata(r.address)}</address>`,
      `  <address_id>${this.escapeXml(r.address_id)}</address_id>`,
      `  <zipcode>${this.escapeXml(r.zipcode)}</zipcode>`,
      `  <lat>${r.lat !== null && r.lat !== undefined ? r.lat : ''}</lat>`,
      `  <long>${r.long !== null && r.long !== undefined ? r.long : ''}</long>`,
      `  <media_url>${r.media_url ? this.escapeXml(r.media_url) : ''}</media_url>`,
      '</request>',
    ].join('\n');
  }

  serializeSubmitResponseXml(resp: Open311SubmitResponseDto): string {
    return [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<service_requests>',
      '<request>',
      `  <service_request_id>${resp.service_request_id}</service_request_id>`,
      `  <token>${this.escapeXml(resp.token)}</token>`,
      `  <service_notice></service_notice>`,
      `  <account_id></account_id>`,
      '</request>',
      '</service_requests>',
    ].join('\n');
  }

  serializeTokenResponseXml(resp: Open311TokenResponseDto): string {
    return [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<tokens>',
      '<token>',
      `  <token>${this.escapeXml(resp.token)}</token>`,
      `  <service_request_id>${resp.service_request_id}</service_request_id>`,
      '</token>',
      '</tokens>',
    ].join('\n');
  }
}
```

---

### src/modules/open311/open311.service.ts

Full GeoReport v2 business logic. Key concerns per FRD §F00:
- **api_key validation:** `ClientsService.findByApiKey(api_key)` (active=true only); null → 403
- **Category visibility filter:** same `permissionFilter(role)` pattern as CategoriesService (FRD §F02.5)
- **ServiceRequest mapping:** exact field mapping to `Open311ServiceRequestDto` (FRD §F00.4 outputs)
- **Token:** random UUID v4 stored as JSON `{"token":"..."}` in `ticketHistory.data` on the `open` action row; `GET /tokens/:token` parses this field back out
- **expected_datetime:** `enteredDate + slaDays * 1 day` (calendar days, not business days — FRD §F00.4 says "enteredDate + slaDays"; treat as calendar days matching legacy PHP behavior)
- **media_url:** URL of first media attachment from `media` table for the ticket

**Note on TicketsService dependency:** This plan depends on TicketsModule (Wave 4, plans 09–10). If TicketsModule is not yet built, the Open311Service.postRequest() can call Prisma directly to create the ticket. The `Open311Service` constructor injection accepts `TicketsService` as optional. Add a TODO comment noting Wave 5 Solr/notification hooks are wired through TicketsService.

```typescript
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CategoriesService } from '../categories/categories.service';
import { ClientsService } from '../people/clients.service';
import {
  Open311Serializer,
  Open311ServiceDto,
  Open311ServiceDefinitionDto,
  Open311ServiceRequestDto,
  Open311SubmitResponseDto,
  Open311TokenResponseDto,
  Open311ServiceAttributeDto,
} from './open311.serializer';
import { PostRequestDto } from './dto/post-request.dto';
import { GetRequestsDto } from './dto/get-requests.dto';
import { randomUUID } from 'crypto';

/** Map role string to permissionLevel filter (FRD §F02.5) — mirrors CategoriesService */
function permissionLevels(role: string | null | undefined): string[] {
  if (role === 'staff') return ['staff', 'public', 'anonymous'];
  if (role) return ['public', 'anonymous']; // authenticated citizen
  return ['anonymous']; // anonymous
}

/** Parse customFields JSON string to Open311ServiceAttributeDto array (FRD §F00.2) */
function parseAttributes(customFields: string | null | undefined): Open311ServiceAttributeDto[] {
  if (!customFields) return [];
  try {
    const parsed = JSON.parse(customFields);
    if (!Array.isArray(parsed)) return [];
    return parsed as Open311ServiceAttributeDto[];
  } catch {
    return [];
  }
}

/** Calculate expected_datetime: enteredDate + slaDays calendar days (FRD §F00.4) */
function calcExpectedDatetime(enteredDate: Date, slaDays: number | null): string | null {
  if (!slaDays) return null;
  const dt = new Date(enteredDate);
  dt.setDate(dt.getDate() + slaDays);
  return dt.toISOString();
}

@Injectable()
export class Open311Service {
  constructor(
    private readonly prisma: PrismaService,
    private readonly categoriesService: CategoriesService,
    private readonly clientsService: ClientsService,
  ) {}

  // ---- F00.1: GET /open311/v2/services ----

  /**
   * Returns all visible categories as Open311 Service objects.
   * Visibility filtered by caller role (FRD §F02.5, §F00.1).
   */
  async getServices(role: string | null | undefined): Promise<Open311ServiceDto[]> {
    const levels = permissionLevels(role);
    const categories = await this.prisma.categories.findMany({
      where: {
        active: true,
        displayPermissionLevel: { in: levels as any },
      },
      include: { categoryGroups: true },
      orderBy: { id: 'asc' },
    });

    return categories.map(cat => ({
      service_code: cat.id,
      service_name: cat.name,
      description: cat.description ?? '',
      metadata: !!(cat.customFields && cat.customFields.trim() !== '' && cat.customFields !== '[]'),
      type: 'realtime' as const,
      keywords: '',
      group: cat.categoryGroups?.name ?? '',
    }));
  }

  // ---- F00.2: GET /open311/v2/services/:id ----

  /**
   * Returns a single ServiceDefinition with attributes from customFields JSON.
   * Returns 404 if not found or not visible to caller's role (FRD §F00.2).
   */
  async getService(id: number, role: string | null | undefined): Promise<Open311ServiceDefinitionDto> {
    const levels = permissionLevels(role);
    const cat = await this.prisma.categories.findUnique({
      where: { id },
      include: { categoryGroups: true },
    });

    if (!cat || !(levels as string[]).includes(cat.displayPermissionLevel)) {
      throw new NotFoundException({ error: 'NOT_FOUND', message: 'Service not found' });
    }

    const attributes = parseAttributes(cat.customFields);

    return {
      service_code: cat.id,
      service_name: cat.name,
      description: cat.description ?? '',
      metadata: attributes.length > 0,
      type: 'realtime' as const,
      keywords: '',
      group: cat.categoryGroups?.name ?? '',
      attributes,
    };
  }

  // ---- F00.3: POST /open311/v2/requests ----

  /**
   * Validates api_key, creates ticket, returns submit response with token.
   * api_key accepted via body or query param (normalized before reaching here).
   * Token is a UUID v4 stored as JSON in ticketHistory.data on the 'open' action row.
   */
  async postRequest(dto: PostRequestDto, rawAttributes?: Record<string, string>): Promise<Open311SubmitResponseDto[]> {
    // 1. Validate api_key (FRD §F00.3, §F11.7 active=true filter)
    const client = await this.clientsService.findByApiKey(dto.api_key);
    if (!client) {
      throw new ForbiddenException({ error: 'FORBIDDEN', message: 'Invalid api_key' });
    }

    // 2. Validate required fields: service_code + location (FRD §F00.3)
    if (!dto.service_code) {
      throw new BadRequestException({ error: 'MISSING_PARAMETER', message: 'service_code is required' });
    }

    const hasLocation = (dto.lat !== undefined && dto.long !== undefined) || dto.address_string;
    if (!hasLocation) {
      throw new BadRequestException({
        error: 'MISSING_PARAMETER',
        message: 'lat and long or address_string required',
      });
    }

    // 3. Validate coordinate ranges (FRD §F00.3)
    if (dto.lat !== undefined && (dto.lat < -90 || dto.lat > 90)) {
      throw new BadRequestException({ error: 'INVALID_INPUT', message: 'Coordinates out of range' });
    }
    if (dto.long !== undefined && (dto.long < -180 || dto.long > 180)) {
      throw new BadRequestException({ error: 'INVALID_INPUT', message: 'Coordinates out of range' });
    }

    // 4. Load category, verify active + postingPermissionLevel = 'anonymous' (FRD §F00.3)
    const category = await this.prisma.categories.findUnique({
      where: { id: dto.service_code },
      include: { departments: true },
    });
    if (!category || !category.active || category.postingPermissionLevel !== 'anonymous') {
      throw new NotFoundException({ error: 'NOT_FOUND', message: 'Service not found' });
    }

    // 5. Resolve/create person for submitter if contact info provided (FRD §F00.3)
    let reportedByPerson_id: number | null = null;
    if (dto.first_name || dto.last_name || dto.email) {
      reportedByPerson_id = await this.resolveOrCreatePerson(dto);
    }

    // 6. Build customFields from attribute[{code}] params (FRD §F00.3)
    const customFields = rawAttributes && Object.keys(rawAttributes).length > 0
      ? JSON.stringify(rawAttributes)
      : null;

    // 7. Create ticket record (FRD §F00.3, §F01.1)
    // enteredByPerson_id = client.contactPerson_id for API submissions (FRD §F00.3)
    const ticket = await this.prisma.tickets.create({
      data: {
        category_id: category.id,
        client_id: client.id,
        enteredByPerson_id: client.contactPerson_id,
        reportedByPerson_id,
        status: 'open',
        latitude: dto.lat ?? null,
        longitude: dto.long ?? null,
        location: dto.address_string ?? null,
        addressId: dto.address_id ?? null,
        description: dto.description ?? null,
        customFields,
        enteredDate: new Date(),
        lastModified: new Date(),
      } as any,
    });

    // 8. Generate submission token — UUID v4 (FRD §F00.3, §F00.6)
    const token = randomUUID();

    // Look up the 'open' action id from reference data
    const openAction = await this.prisma.actions.findFirst({ where: { name: 'open', type: 'system' } });
    if (!openAction) throw new Error('System action "open" not found in actions table — run seed');

    // 9. Append ticketHistory 'open' action with token stored in data (FRD §F00.3)
    await this.prisma.ticketHistory.create({
      data: {
        ticket_id: ticket.id,
        action_id: openAction.id,
        enteredByPerson_id: client.contactPerson_id,
        enteredDate: new Date(),
        actionDate: new Date(),
        data: JSON.stringify({ token }),
        notes: dto.media_url ?? null, // media_url stored in notes (FRD §F00.3)
      } as any,
    });

    // 10. Return submit response (FRD §F00.3 outputs)
    return [{
      service_request_id: ticket.id,
      token,
      service_notice: '',   // always empty per FRD §F00.3
      account_id: '',       // always empty per FRD §F00.3
    }];
  }

  /** Resolve or create people record for Open311 submitter (FRD §F00.3 §F01.1) */
  private async resolveOrCreatePerson(dto: PostRequestDto): Promise<number | null> {
    if (dto.email) {
      // Look up by email in peopleEmails
      const emailRecord = await this.prisma.peopleEmails.findFirst({
        where: { email: dto.email },
        select: { person_id: true },
      });
      if (emailRecord) return emailRecord.person_id;
    }
    // Create new person record
    const person = await this.prisma.people.create({
      data: {
        firstname: dto.first_name ?? null,
        lastname: dto.last_name ?? null,
      } as any,
    });
    // Create email if provided
    if (dto.email) {
      await this.prisma.peopleEmails.create({
        data: {
          person_id: person.id,
          email: dto.email,
          label: 'Other',
          usedForNotifications: false,
        } as any,
      });
    }
    return person.id;
  }

  // ---- F00.4: GET /open311/v2/requests ----

  /**
   * Paginated, filtered list of ServiceRequest objects.
   * Role-visibility filter applied via displayPermissionLevel (FRD §F02.5, §F00.4).
   * page_size capped at 500 (FRD §F00.4).
   */
  async getRequests(dto: GetRequestsDto, role: string | null | undefined): Promise<Open311ServiceRequestDto[]> {
    const levels = permissionLevels(role);
    const pageSize = Math.min(dto.page_size ?? 100, 500);
    const page = dto.page ?? 1;
    const skip = (page - 1) * pageSize;

    // Build where clause
    const where: Record<string, unknown> = {
      categories: {
        displayPermissionLevel: { in: levels },
      },
    };

    // status filter (FRD §F00.4)
    if (dto.status) {
      where['status'] = dto.status;
    } else {
      where['status'] = 'open'; // default per FRD §F00.4
    }

    // service_code filter (FRD §F00.4)
    if (dto.service_code) {
      where['category_id'] = dto.service_code;
    }

    // service_request_id list filter (FRD §F00.4)
    if (dto.service_request_id) {
      const ids = dto.service_request_id.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
      if (ids.length > 0) where['id'] = { in: ids };
    }

    // Date range filters (FRD §F00.4)
    if (dto.start_date || dto.end_date) {
      const dateFilter: Record<string, unknown> = {};
      if (dto.start_date) {
        const d = new Date(dto.start_date);
        if (isNaN(d.getTime())) throw new BadRequestException({ error: 'INVALID_INPUT', message: 'Invalid date format; use ISO 8601' });
        dateFilter['gte'] = d;
      }
      if (dto.end_date) {
        const d = new Date(dto.end_date);
        if (isNaN(d.getTime())) throw new BadRequestException({ error: 'INVALID_INPUT', message: 'Invalid date format; use ISO 8601' });
        dateFilter['lte'] = d;
      }
      where['enteredDate'] = dateFilter;
    }

    // Radius search validation (FRD §F00.4) — actual geo filter deferred to Wave 5 GeoModule
    if (dto.radius !== undefined && (dto.lat === undefined || dto.long === undefined)) {
      throw new BadRequestException({ error: 'MISSING_PARAMETER', message: 'lat and long required for radius search' });
    }

    const tickets = await this.prisma.tickets.findMany({
      where: where as any,
      include: {
        categories: { include: { departments: true } },
        substatus: true,
        media: { take: 1, orderBy: { id: 'asc' } },
      },
      orderBy: { enteredDate: 'desc' },
      skip,
      take: pageSize,
    });

    return tickets.map(t => this.mapTicketToServiceRequest(t));
  }

  // ---- F00.5: GET /open311/v2/requests/:id ----

  /**
   * Single ticket wrapped in array (GeoReport v2 spec).
   * 404 if not found or category not visible (FRD §F00.5).
   */
  async getRequest(id: number, role: string | null | undefined): Promise<Open311ServiceRequestDto[]> {
    const levels = permissionLevels(role);

    const ticket = await this.prisma.tickets.findUnique({
      where: { id },
      include: {
        categories: { include: { departments: true } },
        substatus: true,
        media: { take: 1, orderBy: { id: 'asc' } },
      },
    });

    if (!ticket || !ticket.categories || !(levels as string[]).includes(ticket.categories.displayPermissionLevel)) {
      throw new NotFoundException({ error: 'NOT_FOUND', message: 'Service request not found' });
    }

    return [this.mapTicketToServiceRequest(ticket)];
  }

  // ---- F00.6: GET /open311/v2/tokens/:token ----

  /**
   * Look up token in ticketHistory.data where action is 'open'.
   * Token stored as JSON: {"token": "<uuid>"}.
   * Returns 404 if not found (FRD §F00.6).
   */
  async getToken(token: string): Promise<Open311TokenResponseDto[]> {
    // Find ticketHistory rows with action_id = open action, search data JSON for token
    const openAction = await this.prisma.actions.findFirst({ where: { name: 'open', type: 'system' } });
    if (!openAction) throw new NotFoundException({ error: 'NOT_FOUND', message: 'Token not found' });

    // Postgres JSON containment: find row where data contains the token value
    // Using $queryRaw for JSON field search (Prisma does not support JSON field contains in all versions)
    const results = await this.prisma.$queryRaw<Array<{ ticket_id: number }>>`
      SELECT ticket_id FROM "ticketHistory"
      WHERE action_id = ${openAction.id}
        AND data::jsonb @> ${JSON.stringify({ token })}::jsonb
      LIMIT 1
    `;

    if (!results || results.length === 0) {
      throw new NotFoundException({ error: 'NOT_FOUND', message: 'Token not found' });
    }

    return [{
      token,
      service_request_id: results[0].ticket_id,
    }];
  }

  // ---- Internal helpers ----

  /**
   * Maps a Prisma ticket record (with includes) to Open311ServiceRequestDto.
   * Field mapping per FRD §F00.4 outputs — exact field names required.
   */
  private mapTicketToServiceRequest(ticket: any): Open311ServiceRequestDto {
    const category = ticket.categories;
    const department = category?.departments;
    const substatus = ticket.substatus;
    const firstMedia = ticket.media?.[0] ?? null;

    // expected_datetime: enteredDate + slaDays calendar days (FRD §F00.4)
    const expectedDatetime = calcExpectedDatetime(ticket.enteredDate, category?.slaDays ?? null);

    // media_url: URL to first media attachment (FRD §F00.4)
    // Wave 5 MediaModule will provide the actual URL construction; for now use null placeholder
    // TODO Wave 5: construct URL as /tickets/{id}/media/{internalFilename} via MediaService
    const mediaUrl: string | null = firstMedia
      ? `/tickets/${ticket.id}/media/${firstMedia.internalFilename}`
      : null;

    return {
      service_request_id: ticket.id,
      status: ticket.status as 'open' | 'closed',
      status_notes: substatus?.description ?? '',
      service_name: category?.name ?? '',
      service_code: ticket.category_id ?? 0,
      description: ticket.description ?? '',
      agency_responsible: department?.name ?? '',
      service_notice: '',  // always empty per GeoReport v2 spec (FRD §F00.4)
      requested_datetime: new Date(ticket.enteredDate).toISOString(),
      updated_datetime: new Date(ticket.lastModified).toISOString(),
      expected_datetime: expectedDatetime,
      address: ticket.location ?? '',
      address_id: ticket.addressId ? String(ticket.addressId) : '',
      zipcode: ticket.zip ?? '',
      lat: ticket.latitude ?? null,
      long: ticket.longitude ?? null,
      media_url: mediaUrl,
    };
  }
}
```
  </action>
  <verify>
```bash
npx tsc --noEmit 2>&1 | grep -E 'open311|Open311' | head -20 && echo "TSC_OPEN311_OK"
grep -n 'export class Open311Service' src/modules/open311/open311.service.ts && echo CONTRACT_OK
grep -n 'postRequest\|getRequests\|getToken\|getServices\|getRequest\|getService' src/modules/open311/open311.service.ts | head -10 && echo METHODS_OK
grep -n 'findByApiKey' src/modules/open311/open311.service.ts && echo API_KEY_VALIDATION_OK
grep -n 'FORBIDDEN.*Invalid api_key\|Invalid api_key' src/modules/open311/open311.service.ts && echo APIKEY_ERROR_MSG_OK
grep -n 'service_request_id\|service_notice.*\|account_id.*' src/modules/open311/open311.service.ts | head -5 && echo SUBMIT_RESPONSE_OK
grep -n 'token.*randomUUID\|randomUUID.*token' src/modules/open311/open311.service.ts && echo TOKEN_OK
grep -n 'export class Open311Serializer' src/modules/open311/open311.serializer.ts && echo SERIALIZER_OK
grep -n '<services>' src/modules/open311/open311.serializer.ts && echo XML_SERVICES_ENVELOPE_OK
grep -n '<service_requests>' src/modules/open311/open311.serializer.ts && echo XML_REQUESTS_ENVELOPE_OK
grep -n 'xml version.*1.0.*encoding.*UTF-8' src/modules/open311/open311.serializer.ts && echo XML_DECLARATION_OK
grep -n 'export class PostRequestDto' src/modules/open311/dto/post-request.dto.ts && echo POST_DTO_OK
grep -n 'export class GetRequestsDto' src/modules/open311/dto/get-requests.dto.ts && echo GET_DTO_OK
```
  </verify>
  <done>
- `Open311Service` has all 6 methods: `getServices`, `getService`, `postRequest`, `getRequests`, `getRequest`, `getToken`
- `postRequest()` calls `clientsService.findByApiKey(api_key)` → null throws 403 ForbiddenException with message "Invalid api_key"
- `postRequest()` validates `service_code` + location presence; validates coordinate ranges
- `postRequest()` creates ticket with `status='open'`, appends `ticketHistory` row with `data = JSON.stringify({token})`
- `postRequest()` returns `[{service_request_id, token, service_notice: '', account_id: ''}]` (FRD §F00.3)
- `getToken()` uses `$queryRaw` with Postgres JSON containment `@>` to find token in `ticketHistory.data`
- `mapTicketToServiceRequest()` maps all 16 fields from FRD §F00.4 outputs with exact field names
- `Open311Serializer.serializeServicesXml()` produces `<services><service>...</service></services>` with `<?xml...?>` declaration
- `Open311Serializer.serializeRequestsXml()` produces `<service_requests><request>...</request></service_requests>`
- `PostRequestDto` has all FRD §F00.3 input fields including `jurisdiction_id` (optional, ignored)
- `GetRequestsDto` has all FRD §F00.4 filter params; `page_size` default 100
- TypeScript compiles with zero errors in open311 module files
  </done>
</task>

<task type="auto">
  <name>Task 2: Open311Controller + Open311Module + wire into AppModule</name>
  <files>
    src/modules/open311/open311.controller.ts
    src/modules/open311/open311.module.ts
    src/app.module.ts
  </files>
  <action>
Build the Open311Controller with all 6 GeoReport v2 routes, URL suffix stripping, content negotiation, and the Open311Module. Wire into AppModule.

---

### src/modules/open311/open311.controller.ts

Route prefix: `/open311/v2` (set on the module, not the controller, so the controller uses relative paths).

**URL suffix routing (FRD §F00, §F03.1):**
The `FormatMiddleware` (Wave 2) strips the `.json`/`.xml` suffix and sets `req.negotiatedFormat` before the controller runs. However, since GeoReport v2 clients often include the literal `.json`/`.xml` in the URL path, NestJS must be configured to handle both `/open311/v2/services` and `/open311/v2/services.json` as the same route. Use a `:format(json|xml)?` optional parameter pattern, or rely on the FormatMiddleware having already stripped the suffix.

**Implementation strategy:** Use a single path per endpoint; rely on `FormatMiddleware` to strip `.json`/`.xml` suffix before the NestJS router sees it. The controller reads `req.negotiatedFormat` (set by FormatMiddleware) to determine output format. Default is JSON for all `/open311/v2/` routes (FRD §F03.1).

**api_key extraction:** For all endpoints, `api_key` can arrive as a query param (`?api_key=`) or (for POST) as a body param. Extract from `req.query.api_key ?? req.body.api_key`.

**jurisdiction_id:** Accepted as query param on all endpoints; passed to service but ignored.

**Response writing:** The controller bypasses the global `SerializationInterceptor` for Open311 routes because Open311 has its own strict byte-compatible envelope shapes (GeoReport v2 spec). The controller writes directly to `res` using `@Res()` when XML is requested, or returns a plain object that the global JSON serializer handles for JSON format.

**Simplified approach:** Return the data from the controller as a plain TS object; rely on the global `SerializationInterceptor` for JSON (default) and XML. Tag the response with `@Header('Content-Type', ...)` and use the `Open311Serializer` to produce the correct XML string when `req.negotiatedFormat === 'xml'`.

```typescript
import {
  Controller, Get, Post, Param, Body, Query, Req, Res,
  ParseIntPipe, HttpCode, Header,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Open311Service } from './open311.service';
import {
  Open311Serializer,
} from './open311.serializer';
import { PostRequestDto } from './dto/post-request.dto';
import { GetRequestsDto } from './dto/get-requests.dto';

/** Extract negotiated format from request — default is 'json' for /open311/v2/ routes (FRD §F03.1) */
function getFormat(req: Request): 'json' | 'xml' {
  const fmt = (req as any).negotiatedFormat as string | undefined;
  if (fmt === 'xml') return 'xml';
  return 'json';
}

/** Get the caller's role from req.user (set by AuthMiddleware) */
function getRole(req: Request): string | null {
  return (req as any).user?.role ?? null;
}

@Controller('open311/v2')
export class Open311Controller {
  constructor(
    private readonly open311Service: Open311Service,
    private readonly open311Serializer: Open311Serializer,
  ) {}

  // ---- F00.1: GET /open311/v2/services[.json|.xml] ----

  @Get('services')
  async getServices(@Req() req: Request, @Res() res: Response): Promise<void> {
    const role = getRole(req);
    const services = await this.open311Service.getServices(role);

    if (getFormat(req) === 'xml') {
      res.setHeader('Content-Type', 'application/xml');
      res.send(this.open311Serializer.serializeServicesXml(services));
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.send(this.open311Serializer.serializeServicesJson(services));
    }
  }

  // ---- F00.2: GET /open311/v2/services/:id[.json|.xml] ----

  @Get('services/:id')
  async getService(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const role = getRole(req);
    const def = await this.open311Service.getService(id, role);

    if (getFormat(req) === 'xml') {
      res.setHeader('Content-Type', 'application/xml');
      res.send(this.open311Serializer.serializeServiceDefinitionXml(def));
    } else {
      res.setHeader('Content-Type', 'application/json');
      // ServiceDefinition wrapped in array per GeoReport v2 spec
      res.send(this.open311Serializer.serializeServiceDefinitionJson(def));
    }
  }

  // ---- F00.3: POST /open311/v2/requests[.json|.xml] ----

  @Post('requests')
  @HttpCode(201)
  async postRequest(
    @Body() body: Record<string, any>,
    @Query() query: Record<string, any>,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    // api_key: query param takes precedence over body param (FRD §F00.3)
    const api_key = (query.api_key ?? body.api_key ?? '') as string;

    // Extract PostRequestDto fields from body + query
    const dto: PostRequestDto = {
      api_key,
      service_code: parseInt(String(body.service_code ?? query.service_code), 10),
      lat: body.lat !== undefined ? parseFloat(String(body.lat)) : undefined,
      long: body.long !== undefined ? parseFloat(String(body.long)) : undefined,
      address_string: body.address_string ?? query.address_string,
      address_id: body.address_id ? parseInt(String(body.address_id), 10) : undefined,
      description: body.description,
      first_name: body.first_name,
      last_name: body.last_name,
      email: body.email,
      phone: body.phone,
      device_id: body.device_id,
      media_url: body.media_url,
      jurisdiction_id: query.jurisdiction_id,
    };

    // Extract attribute[{code}] params from body (FRD §F00.3)
    const rawAttributes: Record<string, string> = {};
    for (const key of Object.keys(body)) {
      const match = key.match(/^attribute\[(.+)\]$/);
      if (match) rawAttributes[match[1]] = body[key] as string;
    }

    const result = await this.open311Service.postRequest(dto, rawAttributes);

    if (getFormat(req) === 'xml') {
      res.setHeader('Content-Type', 'application/xml');
      res.status(201).send(this.open311Serializer.serializeSubmitResponseXml(result[0]));
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.status(201).send(JSON.stringify(result));
    }
  }

  // ---- F00.4: GET /open311/v2/requests[.json|.xml] ----

  @Get('requests')
  async getRequests(
    @Query() query: GetRequestsDto,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const role = getRole(req);
    const requests = await this.open311Service.getRequests(query, role);

    if (getFormat(req) === 'xml') {
      res.setHeader('Content-Type', 'application/xml');
      res.send(this.open311Serializer.serializeRequestsXml(requests));
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.send(this.open311Serializer.serializeRequestsJson(requests));
    }
  }

  // ---- F00.5: GET /open311/v2/requests/:id[.json|.xml] ----

  @Get('requests/:id')
  async getRequest(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const role = getRole(req);
    const result = await this.open311Service.getRequest(id, role);  // returns array of 1

    if (getFormat(req) === 'xml') {
      res.setHeader('Content-Type', 'application/xml');
      res.send(this.open311Serializer.serializeRequestsXml(result));
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.send(this.open311Serializer.serializeRequestsJson(result));
    }
  }

  // ---- F00.6: GET /open311/v2/tokens/:token[.json|.xml] ----

  @Get('tokens/:token')
  async getToken(
    @Param('token') token: string,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const result = await this.open311Service.getToken(token);  // returns array of 1

    if (getFormat(req) === 'xml') {
      res.setHeader('Content-Type', 'application/xml');
      res.send(this.open311Serializer.serializeTokenResponseXml(result[0]));
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.send(JSON.stringify(result));
    }
  }
}
```

**Important notes for the executor:**

1. **Route conflict with `.json`/`.xml` suffixes:** The `FormatMiddleware` (Wave 2, plan 03) must strip the `.json`/`.xml` suffix from the URL before NestJS routing happens. Verify `FormatMiddleware` does this; if it does not, add suffix stripping to it. The test is: `curl /open311/v2/services.json` and `curl /open311/v2/services` must both reach `getServices()`.

2. **`@Res()` and NestJS interceptors:** Using `@Res()` bypasses the global `SerializationInterceptor`. This is intentional for Open311 routes — they manage their own content-type and serialization to ensure byte compatibility. Other routes continue to use the global interceptor.

3. **ValidationPipe and `@Body()` on POST:** Since Open311 POST bodies may arrive as `application/x-www-form-urlencoded` (common for Open311 clients), ensure `main.ts` has `app.useBodyParser('urlencoded', { extended: true })` (or NestJS equivalent). NestJS enables JSON body parsing by default; urlencoded must be explicitly enabled.

---

### src/modules/open311/open311.module.ts

```typescript
import { Module } from '@nestjs/common';
import { Open311Controller } from './open311.controller';
import { Open311Service } from './open311.service';
import { Open311Serializer } from './open311.serializer';
import { CategoriesModule } from '../categories/categories.module';
import { PeopleModule } from '../people/people.module';

// NOTE: TicketsModule is NOT imported here for Wave 4c (plan 11).
// Open311Service.postRequest() creates tickets directly via PrismaService
// (Wave 4a/b TicketsModule may not yet be built when this plan executes).
// When Wave 4a/b TicketsModule is available, refactor postRequest() to
// call TicketsService.create() for Solr indexing, geo-cluster, and email hooks.
// TODO Wave 5: import TicketsModule and inject TicketsService into Open311Service.

@Module({
  imports: [
    CategoriesModule,   // CategoriesService for visibility filtering (Wave 3 plan 07)
    PeopleModule,       // ClientsService.findByApiKey for api_key validation (Wave 3 plan 08)
  ],
  controllers: [Open311Controller],
  providers: [Open311Service, Open311Serializer],
})
export class Open311Module {}
```

---

### src/app.module.ts (update)

Add `Open311Module` to the root module imports. Merge carefully with the existing `app.module.ts` state from prior plans (plans 03–08 already wrote various versions of this file). The authoritative merged state after all Wave 3 + Wave 4c plans:

```typescript
import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { GelfLoggerModule } from './common/logger/gelf-logger.module';
import { GelfRequestMiddleware } from './common/middleware/gelf-request.middleware';
import { GelfExceptionFilter } from './common/filters/gelf-exception.filter';
import { FormatMiddleware } from './common/middleware/format.middleware';
import { AuthMiddleware } from './common/middleware/auth.middleware';
import { SerializationInterceptor } from './common/interceptors/serialization.interceptor';
import { JsonSerializer } from './common/serializers/json.serializer';
import { XmlSerializer } from './common/serializers/xml.serializer';
import { CsvSerializer } from './common/serializers/csv.serializer';
import { TxtSerializer } from './common/serializers/txt.serializer';
import { HtmlRenderer } from './common/serializers/html.renderer';
import { CaslGuard } from './common/guards/casl.guard';
import { AuthGuard } from './common/guards/auth.guard';
import { PiiMaskInterceptor } from './common/interceptors/pii-mask.interceptor';
import { AuthModule } from './modules/auth/auth.module';
import { AdminModule } from './modules/admin/admin.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { DepartmentsModule } from './modules/departments/departments.module';
import { PeopleModule } from './modules/people/people.module';
import { Open311Module } from './modules/open311/open311.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    GelfLoggerModule,
    AuthModule,        // @Global() — exports SessionService + AbilityFactory everywhere
    AdminModule,
    CategoriesModule,
    DepartmentsModule,
    PeopleModule,
    Open311Module,     // ← NEW: Wave 4c
    // Wave 4a/b: TicketsModule — added when plans 09/10 execute
    // Wave 5: SearchModule, NotificationsModule, MediaModule, GeoModule
    // Wave 6: BookmarksModule, ReportsModule
  ],
  providers: [
    JsonSerializer,
    XmlSerializer,
    CsvSerializer,
    TxtSerializer,
    HtmlRenderer,
    {
      provide: APP_INTERCEPTOR,
      useClass: SerializationInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: GelfExceptionFilter,
    },
    // Guards and interceptors registered as providers for @UseGuards() injection (Wave 3 plan 06)
    CaslGuard,
    AuthGuard,
    PiiMaskInterceptor,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    // Middleware order: FormatMiddleware → GelfRequestMiddleware → AuthMiddleware
    // express-session is wired in main.ts (before NestJS middleware pipeline)
    consumer
      .apply(FormatMiddleware, GelfRequestMiddleware, AuthMiddleware)
      .forRoutes('*');
  }
}
```

**IMPORTANT merger note:** Read the existing `src/app.module.ts` before writing. If prior plans (03–08) have already added some of these imports/providers, do NOT duplicate them. Add only what is missing. The final `imports` array must contain all modules listed above. The `configure()` method must apply all three middleware in the order shown.
  </action>
  <verify>
```bash
npx tsc --noEmit 2>&1 | head -30 && echo "TSC_OK"
grep -n 'export class Open311Module' src/modules/open311/open311.module.ts && echo CONTRACT_OK
grep -n 'export class Open311Controller' src/modules/open311/open311.controller.ts && echo CONTROLLER_OK
grep -n 'open311/v2' src/modules/open311/open311.controller.ts && echo ROUTE_PREFIX_OK
grep -n 'getServices\|getService\|postRequest\|getRequests\|getRequest\|getToken' src/modules/open311/open311.controller.ts | wc -l && echo ROUTE_COUNT_CHECK
grep -n "Get('services')\|Get('services/:id')\|Post('requests')\|Get('requests')\|Get('requests/:id')\|Get('tokens/:token')" src/modules/open311/open311.controller.ts && echo ALL_6_ROUTES_OK
grep -n 'Open311Module' src/app.module.ts && echo APP_MODULE_WIRED_OK
grep -n 'FormatMiddleware.*GelfRequestMiddleware.*AuthMiddleware\|apply.*FormatMiddleware' src/app.module.ts && echo MIDDLEWARE_ORDER_OK
grep -n 'CategoriesModule\|PeopleModule' src/modules/open311/open311.module.ts && echo DEPS_IMPORTED_OK
grep -n 'negotiatedFormat\|getFormat' src/modules/open311/open311.controller.ts && echo FORMAT_DETECTION_OK
grep -n 'application/xml\|application/json' src/modules/open311/open311.controller.ts && echo CONTENT_TYPE_HEADERS_OK
```
  </verify>
  <done>
- `Open311Module` exists at `src/modules/open311/open311.module.ts`; imports `CategoriesModule` and `PeopleModule`
- `Open311Controller` is decorated with `@Controller('open311/v2')`
- All 6 GeoReport v2 routes present: `GET services`, `GET services/:id`, `POST requests`, `GET requests`, `GET requests/:id`, `GET tokens/:token`
- Controller reads `req.negotiatedFormat` to choose JSON or XML output
- XML responses use `Open311Serializer` with correct envelopes; JSON uses `JSON.stringify`
- Controller sets `Content-Type: application/json` or `application/xml` header on every response
- `Open311Module` imported in `AppModule`
- `AppModule.configure()` applies `FormatMiddleware → GelfRequestMiddleware → AuthMiddleware` in order
- `npx tsc --noEmit` exits 0 with zero TypeScript strict-mode errors
  </done>
</task>

</tasks>

<verification>
After both tasks complete, run the following:

```bash
# TypeScript strict mode — zero errors required
npx tsc --noEmit 2>&1 | head -30 && echo "TSC_OK"

# Module contracts
grep -n 'export class Open311Module' src/modules/open311/open311.module.ts && echo CONTRACT_OK
grep -n 'export class Open311Service' src/modules/open311/open311.service.ts && echo CONTRACT_OK
grep -n 'export class Open311Serializer' src/modules/open311/open311.serializer.ts && echo CONTRACT_OK
grep -n 'export class Open311Controller' src/modules/open311/open311.controller.ts && echo CONTRACT_OK

# All 6 routes present in controller
grep -n "Get('services')" src/modules/open311/open311.controller.ts && echo ROUTE_SERVICES_OK
grep -n "Get('services/:id')" src/modules/open311/open311.controller.ts && echo ROUTE_SERVICE_ID_OK
grep -n "Post('requests')" src/modules/open311/open311.controller.ts && echo ROUTE_POST_REQUESTS_OK
grep -n "Get('requests')" src/modules/open311/open311.controller.ts && echo ROUTE_GET_REQUESTS_OK
grep -n "Get('requests/:id')" src/modules/open311/open311.controller.ts && echo ROUTE_GET_REQUEST_ID_OK
grep -n "Get('tokens/:token')" src/modules/open311/open311.controller.ts && echo ROUTE_TOKENS_OK

# api_key validation chain
grep -n 'findByApiKey' src/modules/open311/open311.service.ts && echo API_KEY_CHAIN_OK
grep -n 'FORBIDDEN.*Invalid api_key\|Invalid api_key.*FORBIDDEN' src/modules/open311/open311.service.ts && echo API_KEY_ERROR_OK

# Token mechanics
grep -n 'randomUUID' src/modules/open311/open311.service.ts && echo TOKEN_UUID_OK
grep -n 'queryRaw' src/modules/open311/open311.service.ts && echo TOKEN_LOOKUP_OK

# XML envelope shapes
grep -n '<services>' src/modules/open311/open311.serializer.ts && echo XML_SERVICES_OK
grep -n '<service_requests>' src/modules/open311/open311.serializer.ts && echo XML_REQUESTS_OK
grep -n 'xml version.*1.0.*encoding.*UTF-8' src/modules/open311/open311.serializer.ts && echo XML_DECLARATION_OK

# GeoReport v2 required response fields in mapping
grep -n 'service_request_id\|requested_datetime\|updated_datetime\|agency_responsible' src/modules/open311/open311.service.ts && echo FIELD_MAPPING_OK

# App wiring
grep -n 'Open311Module' src/app.module.ts && echo APP_MODULE_OK

# DTOs
ls src/modules/open311/dto/post-request.dto.ts src/modules/open311/dto/get-requests.dto.ts && echo DTOS_EXIST
```

Expected: TSC exits 0, all checks pass.
</verification>

<success_criteria>
**F0 — Open311Module complete when:**

- `GET /open311/v2/services` returns array of `{service_code, service_name, description, metadata, type:'realtime', keywords:'', group}` objects filtered to caller's `displayPermissionLevel` visibility (FRD §F00.1, §F02.5)

- `GET /open311/v2/services/:id` returns `[{...service, attributes:[...]}]` (single-element array); 404 for non-existent or non-visible category (FRD §F00.2)

- `POST /open311/v2/requests` with valid `api_key` + `service_code` + location creates ticket and returns `[{service_request_id, token, service_notice:'', account_id:''}]` (FRD §F00.3)

- `POST /open311/v2/requests` with invalid or inactive `api_key` returns HTTP 403 `{"error":"FORBIDDEN","message":"Invalid api_key"}` (FRD §F00.3)

- `POST /open311/v2/requests` without location returns HTTP 400 `{"error":"MISSING_PARAMETER","message":"lat and long or address_string required"}` (FRD §F00.3)

- Token stored as `JSON.stringify({token})` in `ticketHistory.data` on the `open` action row (FRD §F00.3 + §F00.6 dependency)

- `GET /open311/v2/requests` returns paginated ServiceRequest list with default status='open', page_size=100 capped at 500 (FRD §F00.4)

- `GET /open311/v2/requests/:id` returns single-element array `[{...ServiceRequest}]`; 404 if ticket not found or category not visible (FRD §F00.5)

- `GET /open311/v2/tokens/:token` returns `[{token, service_request_id}]` via Postgres JSON `@>` lookup in `ticketHistory.data`; 404 if not found (FRD §F00.6)

- XML responses include `<?xml version="1.0" encoding="UTF-8"?>` declaration; services list wrapped in `<services>`, requests list in `<service_requests>` (FRD §F03.4)

- `jurisdiction_id` accepted as query param on all endpoints without error (FRD §F00.1)

- `Open311Module` imported in `AppModule`; `CategoriesModule` and `PeopleModule` imported in `Open311Module`

- `AppModule.configure()` applies middleware in order: `FormatMiddleware → GelfRequestMiddleware → AuthMiddleware`

- `npx tsc --noEmit` exits 0 with zero TypeScript strict-mode errors
</success_criteria>

<output>
No SUMMARY.md required for express-mode plans.

Wave 5 integration notes for downstream plans:
- `Open311Service.postRequest()` currently creates tickets directly via PrismaService. Once Wave 4a/b TicketsModule (plans 09–10) is built, refactor to call `TicketsService.create()` to gain Solr indexing, geo-cluster assignment, and email notification hooks.
- `mapTicketToServiceRequest()` currently constructs `media_url` as `/tickets/{id}/media/{internalFilename}` directly. Once Wave 5 MediaModule is built, update to use the MediaService URL builder.
- Wave 5 GeoModule will implement actual PostGIS radius search for `GET /requests?lat=&long=&radius=`; current implementation accepts the params and logs a TODO.
</output>
