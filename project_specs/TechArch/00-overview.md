# TechArch — uReport Re-Platform
**Project:** uReport  
**Acronym:** uReport  
**Version:** 1.0  
**Date:** 2026-06-23  
**Status:** Active  
**Based on:** PRD-uReport.md v1.0, FRD-uReport.md v1.0  

---

## 1. Architectural Overview

### 1.1 Pattern

uReport adopts a **Modular Monolith** architecture built on NestJS. The application is structured as a single deployable Node.js process whose internals are divided into discrete NestJS modules — each owning its own controllers, services, and repository logic. This pattern maps 1:1 to the legacy PHP Controller/Service/Repository domain model, preserving cognitive familiarity for contributors while eliminating the operational complexity of a microservices split.

**Key architectural decisions:**

| Decision | Rationale |
|----------|-----------|
| Modular monolith (not microservices) | Single process deployment matches existing Apache/mod_php model; service boundaries are enforced by NestJS DI module scope, not network calls |
| NestJS as framework | Decorator-based DI mirrors PHP controller dispatch; built-in interceptor/guard/pipe pipeline replaces bespoke PHP middleware |
| Prisma ORM | Strong TypeScript types, migration tooling (`prisma migrate`), PostgreSQL DDL generation; replaces ActiveRecord + PdoRepository |
| Global `SerializationInterceptor` | Replaces ~187 PHP `.inc` partial templates; single interceptor handles all 5 formats (HTML/JSON/XML/CSV/TXT) across every endpoint |
| CASL for RBAC | Attribute-based access control maps Laminas ACL resource/privilege model cleanly to TypeScript type-safe guards |
| `express-session` + Redis | Server-side sessions preserve the PHP `$_SESSION` cookie semantics; Redis enables multi-replica session sharing |
| Apache Solr retained | Reusing the existing Solr core preserves ranking/field-mapping parity; switching search engines risks divergence |
| PostGIS for spatial | `geometry(Point, 4326)` replaces MySQL `POINT SRID 0`; GiST indexes enable KNN geo-cluster assignment |

---

### 1.2 System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         EXTERNAL CLIENTS                            │
│  Mobile Apps   City Portal   Third-Party APIs   Browser (Staff/Pub) │
└──────────────┬──────────────────────────────────┬───────────────────┘
               │ Open311 GeoReport v2              │ Web UI / REST API
               │ JSON / XML                        │ HTML / JSON / XML / CSV / TXT
               ▼                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    LOAD BALANCER / INGRESS (k8s)                    │
└────────────────────────────┬────────────────────────────────────────┘
                             │
               ┌─────────────▼──────────────┐
               │    NestJS Application       │
               │    Node.js LTS / TypeScript │
               │                             │
               │  ┌────────────────────────┐ │
               │  │  NestJS Request Pipeline│ │
               │  │  ─────────────────────  │ │
               │  │  FormatMiddleware       │ │   ← resolves Accept/suffix → format
               │  │  AuthMiddleware         │ │   ← loads session → req.user
               │  │  CaslGuard              │ │   ← RBAC allow/deny
               │  │  ValidationPipe         │ │   ← class-validator DTOs
               │  │  SerializationInterceptor│ │   ← HTML/JSON/XML/CSV/TXT output
               │  └────────────────────────┘ │
               │                             │
               │  ┌──────────────────────────────────────────────┐  │
               │  │              NestJS Modules                   │  │
               │  │                                               │  │
               │  │  Open311Module    TicketsModule               │  │
               │  │  AuthModule       PeopleModule                │  │
               │  │  CategoriesModule DepartmentsModule           │  │
               │  │  SearchModule     MediaModule                 │  │
               │  │  NotificationsModule  BookmarksModule         │  │
               │  │  GeoModule        ReportsModule               │  │
               │  │  AdminModule      LoggerModule                │  │
               │  └──────────────────────────────────────────────┘  │
               │                             │
               └──────────┬──────────────────┘
                          │
          ┌───────────────┼────────────────────────────┐
          │               │                            │
          ▼               ▼                            ▼
┌──────────────┐  ┌───────────────┐         ┌─────────────────┐
│  PostgreSQL  │  │  Apache Solr  │         │     Redis        │
│  + PostGIS   │  │  (uReport     │         │  (Session Store) │
│              │  │   core)       │         │                  │
│  Prisma ORM  │  │  solr-client  │         │  connect-redis   │
│  (schema.    │  │  npm          │         │  ioredis         │
│   prisma)    │  └───────────────┘         └─────────────────┘
└──────────────┘
          │
          │  side-effects
          ▼
┌──────────────────────────────────────────────────────┐
│              External Services                        │
│                                                       │
│  OIDC IdP           SMTP Server        Graylog        │
│  (openid-client)    (Nodemailer)       (GELF/UDP)     │
│                                        gelf-pro       │
└──────────────────────────────────────────────────────┘
```

---

### 1.3 Deployment Topology

```
┌────────────────────────────────────────────────────────┐
│                  Kubernetes Cluster                     │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Deployment: uReport (2+ replicas)              │   │
│  │  Image: node:lts-alpine                         │   │
│  │  Port: 3000                                     │   │
│  │  Resources: 512Mi–1Gi RAM, 0.5–1 CPU            │   │
│  │  EnvFrom: ConfigMap + Secret                    │   │
│  │  VolumeMount: /var/uReport/media (PVC)          │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌────────────────┐  ┌───────────┐  ┌──────────────┐   │
│  │ PostgreSQL     │  │ Redis     │  │ Apache Solr  │   │
│  │ StatefulSet    │  │ Deployment│  │ StatefulSet  │   │
│  │ + PVC          │  │           │  │ + PVC        │   │
│  └────────────────┘  └───────────┘  └──────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Ingress (nginx / traefik)                      │   │
│  │  TLS termination                                │   │
│  └─────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────┘

External (outside cluster):
  OIDC IdP (city SSO)
  SMTP relay
  Graylog instance
```

**Environment variables summary:**

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection URL |
| `SESSION_SECRET` | Cookie signing secret |
| `SESSION_TTL_SECONDS` | Session TTL (default: 3600) |
| `OIDC_ISSUER` | OIDC discovery base URL |
| `OIDC_CLIENT_ID` | OIDC client ID |
| `OIDC_CLIENT_SECRET` | OIDC client secret |
| `OIDC_REDIRECT_URI` | OIDC callback URL |
| `OIDC_END_SESSION_ENDPOINT` | Optional IdP end-session URL |
| `SOLR_HOST` | Solr hostname (default: localhost) |
| `SOLR_PORT` | Solr port (default: 8983) |
| `SOLR_CORE` | Solr core name (default: uReport) |
| `SMTP_HOST` | SMTP server hostname |
| `SMTP_PORT` | SMTP port (default: 587) |
| `SMTP_USER` | SMTP username |
| `SMTP_PASS` | SMTP password |
| `SMTP_SECURE` | TLS flag (default: false) |
| `SMTP_FROM` | From address |
| `GRAYLOG_HOST` | Graylog hostname |
| `GRAYLOG_PORT` | GELF input port (default: 12201) |
| `GRAYLOG_TRANSPORT` | `udp` or `tcp` (default: udp) |
| `GRAYLOG_FACILITY` | Facility label (default: uReport) |
| `MEDIA_STORAGE_PATH` | File storage root (default: /var/uReport/media) |
| `MEDIA_MAX_BYTES` | Max upload size (default: 10485760) |
| `DIGEST_CRON` | Cron schedule for digest notifications |
| `PORT` | HTTP listen port (default: 3000) |

---

### 1.4 NestJS Module Map

```
src/
├── app.module.ts                  ← root module: imports all feature modules
│
├── common/
│   ├── interceptors/
│   │   └── serialization.interceptor.ts   ← global SerializationInterceptor
│   ├── guards/
│   │   ├── casl.guard.ts                  ← RBAC guard
│   │   └── auth.guard.ts                  ← session auth check
│   ├── middleware/
│   │   └── format.middleware.ts           ← resolves Accept/suffix to format
│   ├── decorators/
│   │   └── check-abilities.decorator.ts
│   ├── serializers/
│   │   ├── json.serializer.ts
│   │   ├── xml.serializer.ts
│   │   ├── csv.serializer.ts
│   │   └── txt.serializer.ts
│   └── logger/
│       └── gelf-logger.service.ts         ← NestJS LoggerService → GELF
│
├── modules/
│   ├── open311/          ← Open311 GeoReport v2 (versioned API)
│   ├── tickets/          ← Ticket lifecycle
│   ├── auth/             ← OIDC + session management
│   ├── people/           ← People + contact details
│   ├── categories/       ← Categories + category groups
│   ├── departments/      ← Departments + associations
│   ├── search/           ← Solr search
│   ├── media/            ← Attachment upload/serve
│   ├── notifications/    ← Nodemailer email sends
│   ├── bookmarks/        ← Saved searches
│   ├── geo/              ← Geo-cluster assignment + map endpoint
│   ├── reports/          ← Metrics + CSV exports
│   └── admin/            ← Sub-status, actions, issue types, contact methods
│
└── prisma/
    └── prisma.service.ts ← PrismaClient wrapper (global singleton)
```
