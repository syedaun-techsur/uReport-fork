# FRD — uReport Re-Platform
**Project:** uReport  
**Acronym:** uReport  
**Version:** 1.0  
**Date:** 2026-06-23  
**Status:** Draft  
**Based on:** PRD-uReport.md v1.0  

---

## Scope

This Functional Requirements Document specifies the exact behavior — inputs, outputs, validation rules, error states, API surface, and database schema — for all 16 features of the uReport re-platform from PHP/MySQL to Node.js/TypeScript/NestJS/PostgreSQL. The primary goal is 100% feature and behavior parity with the legacy PHP application, including byte-compatible Open311 GeoReport v2 API responses and identical content-negotiation output across all five supported formats.

---

## How to Read This Document

- **Feature IDs** follow PRD numbering: `F00` through `F15`.
- **Cross-feature references** use the notation `see F03 §Process` or `see Y1-api.md §Open311`.
- **HTTP status codes** are the canonical response codes; deviations from these are bugs.
- **"byte-compatible"** means JSON/XML/CSV/TXT responses are character-for-character identical to the legacy PHP output for the same input fixture.
- **DDL** for all entities is consolidated in `Y0-schema.md`. Per-feature schema sections list affected tables only.
- **REST endpoints** are consolidated in `Y1-api.md`. Per-feature API sections list the endpoint signature only.
- **Error codes** are consolidated in `Y2-errors.md`. Per-feature error tables list the common-path errors only.

---

## Table of Contents

### Feature Chunks
- [F00: Open311 GeoReport v2 REST API](F00-open311-api.md)
- [F01: Ticket Lifecycle Management](F01-ticket-lifecycle.md)
- [F02: Role-Based Access Control (RBAC)](F02-rbac.md)
- [F03: Content Negotiation & Multi-Format Serialization](F03-content-negotiation.md)
- [F04: OIDC Authentication](F04-oidc-auth.md)
- [F05: Full-Text Search via Apache Solr](F05-solr-search.md)
- [F06: MySQL-to-PostgreSQL Schema Migration](F06-schema-migration.md)
- [F07: Email Notifications](F07-email.md)
- [F08: Media & Attachment Management](F08-media.md)
- [F09: Geo-Clustering of Ticket Locations](F09-geo-clustering.md)
- [F10: Category & Department Administration](F10-category-dept-admin.md)
- [F11: People & API Client Management](F11-people-clients.md)
- [F12: Bookmarked Searches](F12-bookmarks.md)
- [F13: Reporting & Metrics](F13-reporting.md)
- [F14: Structured Logging via GELF/Graylog](F14-logging.md)
- [F15: Sub-Status & Action Reference Data](F15-substatus-actions.md)

### Cross-Feature Chunks
- [Y0: Database Schema (PostgreSQL DDL)](Y0-schema.md)
- [Y1: REST API Endpoints Catalog](Y1-api.md)
- [Y2: Error Catalog](Y2-errors.md)
- [Y3: External Integration Points](Y3-integrations.md)

---

## Cross-Cutting Terminology

| Term | Definition |
|------|-----------|
| **Ticket** | A service request submitted by a citizen or entered by staff; the core entity of uReport |
| **Category** | A service category (e.g., "Pothole", "Graffiti") that classifies tickets and routes them to a department |
| **Department** | A city department (e.g., Public Works) that owns categories and receives tickets |
| **Person** | Any individual in the system — citizen, staff, or API contact; stored in the `people` table |
| **Staff** | Authenticated city employee with `role = 'staff'` or higher in `people.role` |
| **Public** | Authenticated citizen (OIDC login, no staff role) |
| **Anonymous** | Unauthenticated request — no session, no identity |
| **Action** | A typed event logged to `ticketHistory` (open, assignment, closed, comment, etc.) |
| **Sub-status** | A qualifying status for closed tickets: Resolved, Duplicate, or Bogus |
| **api_key** | 50-character token in the `clients` table authenticating Open311 API write access |
| **GeoReport v2** | The Open311 GeoReport v2 specification defining the public REST API contract |
| **CASL** | The NestJS CASL library replacing Laminas ACL for attribute-based access control |
| **Serialization Interceptor** | NestJS global interceptor that converts controller return values to HTML/JSON/XML/CSV/TXT |
| **PostGIS** | PostgreSQL spatial extension replacing MySQL `POINT SRID 0` |
| **Prisma** | The ORM layer generating type-safe queries from `schema.prisma` |
| **OIDC** | OpenID Connect — the authentication protocol used for citizen and staff login |
| **ticketHistory** | Audit trail table — every state change, comment, and action on a ticket is appended here |
| **permissionLevel** | One of `'staff'`, `'public'`, `'anonymous'` — controls visibility and posting rights per category |
| **contactMethod** | How a ticket was submitted: Email, Phone, Web Form, Other |
| **issueType** | The nature of the request: Comment, Complaint, Question, Report, Request, Violation |
| **Geo-cluster** | A pre-computed spatial cluster assigned to a ticket at one of 7 zoom levels (0–6) |
| **SLA days** | Service Level Agreement: number of business days target for ticket resolution per category |

---

## Conventions

- All timestamps stored as UTC; displayed in local timezone per UI locale.
- Boolean columns use PostgreSQL `BOOLEAN` (not `TINYINT(1)`).
- All string inputs are trimmed of leading/trailing whitespace before validation.
- Foreign key IDs use unsigned integers mapped to PostgreSQL `INTEGER` (or `SERIAL`/`IDENTITY`).
- `lastModified` on `tickets` is updated on every write operation (trigger or service-layer).
- HTTP `401 Unauthorized` is returned when authentication is required but absent.
- HTTP `403 Forbidden` is returned when the authenticated user lacks permission.
- HTTP `404 Not Found` is returned when an entity does not exist or is not visible to the caller's role.
- The `Accept` header is evaluated before the URL suffix for format negotiation.

---

*FRD generated: 2026-06-23 | Model: claude-sonnet-4-6*
