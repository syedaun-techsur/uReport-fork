---

## 6. Technology Stack

### 6.1 Core Runtime & Framework

| Layer | Technology | Version | Purpose |
|-------|------------|---------|---------|
| Runtime | Node.js LTS | 20.x (LTS) | JavaScript runtime |
| Language | TypeScript | 5.x (strict) | Type-safe application code |
| Framework | NestJS | 10.x | Modular HTTP framework (DI, guards, interceptors, pipes) |
| HTTP adapter | Express.js | 4.x | Underlying HTTP server (NestJS default adapter) |
| Config | `@nestjs/config` | — | Environment variable management |
| Validation | `class-validator` + `class-transformer` | — | DTO validation via `ValidationPipe` |
| Scheduling | `@nestjs/schedule` | — | Digest notification cron jobs |

### 6.2 Database & ORM

| Layer | Technology | Version | Purpose |
|-------|------------|---------|---------|
| Database | PostgreSQL | ≥ 14 | Primary relational data store |
| Spatial extension | PostGIS | ≥ 3.0 | `geometry(Point, 4326)` for geo-clusters |
| ORM | Prisma | 5.x | Type-safe queries, migrations, schema management |
| Raw spatial SQL | `prisma.$queryRaw` | — | PostGIS KNN (`<->`) and `ST_DWithin` queries |

**Prisma setup:**
```
prisma/
├── schema.prisma   ← models mirroring all 21 tables
└── migrations/     ← prisma migrate history
```

`DATABASE_URL` env var format: `postgresql://user:pass@host:5432/ureport`

### 6.3 Session & Cache

| Layer | Technology | Version | Purpose |
|-------|------------|---------|---------|
| Session middleware | `express-session` | 1.x | Cookie-based server-side sessions |
| Session store | `connect-redis` | 7.x | Redis-backed session persistence |
| Redis client | `ioredis` | 5.x | Redis connection for session store |

### 6.4 Authentication & Authorization

| Layer | Technology | Version | Purpose |
|-------|------------|---------|---------|
| OIDC client | `openid-client` | 5.x | Authorization code flow, token exchange, discovery |
| RBAC | `@casl/ability` | 6.x | Attribute-based access control rules |
| NestJS CASL | `@casl/nestjs` (or custom) | — | `CaslGuard` integration |

### 6.5 Search

| Layer | Technology | Version | Purpose |
|-------|------------|---------|---------|
| Search engine | Apache Solr | (existing) | Full-text indexing with eDisMax |
| Node client | `solr-client` npm | latest | Query construction and indexing |

**Solr core:** `uReport` (pre-existing; field schema preserved from legacy Solarium integration)

### 6.6 Email Notifications

| Layer | Technology | Version | Purpose |
|-------|------------|---------|---------|
| Email | `nodemailer` | 6.x | SMTP transport for ticket event emails |
| Templates | Handlebars (inline string substitution) | — | `{variable}` placeholder syntax for email bodies |

### 6.7 Media & File Handling

| Layer | Technology | Version | Purpose |
|-------|------------|---------|---------|
| Upload | `multer` (via `@nestjs/platform-express`) | — | `multipart/form-data` file upload |
| Thumbnail | `sharp` | — | Image thumbnail generation for image/* MIME types |
| Storage | Local filesystem | — | `{MEDIA_STORAGE_PATH}/{ticket_id}/{internalFilename}` |

### 6.8 Logging & Observability

| Layer | Technology | Version | Purpose |
|-------|------------|---------|---------|
| GELF logging | `gelf-pro` | latest | GELF 1.1 UDP/TCP transport to Graylog |
| NestJS logger | Custom `GelfLoggerService` | — | Implements `LoggerService`; wraps `gelf-pro` |
| Request logging | NestJS `LoggingInterceptor` | — | HTTP method/path/status/duration per request |

### 6.9 Content Negotiation & Serialization

| Layer | Technology | Purpose |
|-------|------------|---------|
| HTML templates | Handlebars (`hbs` or `@nestjs/platform-express`) | Server-side HTML rendering |
| XML serialization | `xml-js` or custom builder | Byte-compatible XML output |
| CSV serialization | `csv-stringify` | Legacy-compatible CSV with UTF-8 BOM |
| TXT serialization | Custom string builder | Tab-delimited plaintext feed |
| Format middleware | Custom NestJS middleware | Resolves suffix / Accept → `req.negotiatedFormat` |

### 6.10 Developer Tooling

| Tool | Purpose |
|------|---------|
| `jest` + `@nestjs/testing` | Unit and integration tests (≥80% coverage target) |
| `supertest` | HTTP integration tests for Open311 API |
| `eslint` + `@typescript-eslint` | Linting (`strict` rules) |
| `prettier` | Code formatting |
| `ts-jest` | TypeScript Jest transformer |
| `prisma migrate` | Database schema migration |
| Docker + `docker-compose.yml` | Local development environment (PG + Redis + Solr) |

### 6.11 package.json Key Dependencies

```json
{
  "dependencies": {
    "@nestjs/common": "^10.0.0",
    "@nestjs/core": "^10.0.0",
    "@nestjs/platform-express": "^10.0.0",
    "@nestjs/config": "^3.0.0",
    "@nestjs/schedule": "^4.0.0",
    "@prisma/client": "^5.0.0",
    "@casl/ability": "^6.0.0",
    "openid-client": "^5.0.0",
    "express-session": "^1.17.0",
    "connect-redis": "^7.0.0",
    "ioredis": "^5.0.0",
    "nodemailer": "^6.0.0",
    "solr-client": "latest",
    "gelf-pro": "latest",
    "multer": "^1.4.0",
    "sharp": "^0.33.0",
    "class-validator": "^0.14.0",
    "class-transformer": "^0.5.0",
    "hbs": "^4.2.0",
    "csv-stringify": "^6.0.0"
  },
  "devDependencies": {
    "prisma": "^5.0.0",
    "typescript": "^5.0.0",
    "jest": "^29.0.0",
    "ts-jest": "^29.0.0",
    "@nestjs/testing": "^10.0.0",
    "supertest": "^6.0.0",
    "eslint": "^8.0.0",
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "prettier": "^3.0.0"
  }
}
```
