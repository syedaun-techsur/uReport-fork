# UX Mockup — uReport Re-Platform

**Project:** uReport — Open311 GeoReport v2 Municipal CRM
**Generated:** 2026-06-23
**Based on:** UserStories-uReport.md, JOURNEYS-uReport.md, PRD-uReport.md, FRD-uReport.md
**User Story Coverage:** US-0.x through US-15.x (Epics 0–15)

---

## Overview

uReport serves three distinct user classes — anonymous citizens, authenticated residents, and municipal staff — each with fundamentally different interaction patterns and information needs. The UX architecture reflects this three-tier model across every screen and flow.

### Design Principles

1. **Transparency builds trust.** Citizens who cannot trust that their report was received will phone the city instead. Every submission must return an immediate, copyable confirmation token. Every status change must surface a timestamp that matches the email notification timestamp.

2. **Parity, not redesign.** The re-platform constraint (PRD §10) forbids UI redesign. HTML output must match the existing interface structure. Wireframes in this document describe the *intended* structure of those existing screens, not new designs.

3. **Roles dictate context.** Anonymous citizens see the minimal submission form. Authenticated residents see their personal ticket history. Staff see the full queue with filters, actions, and audit trails. Role-appropriate UI is enforced by CASL guards and reflected visually (lock icons, field labels, panel visibility).

4. **Feedback at every async boundary.** Form submissions, filter changes, Solr queries, and file uploads all cross an async boundary. Each gets a loading state, a success state, and an error state — no silent failures.

5. **Discoverability for power features.** Bookmarks, duplicate search, CSV export, and "Save this search" are invisible unless surfaced contextually. Each is anchored to the moment the user most needs it.

### Screen Inventory

| Screen ID | Screen Name | Primary Persona | Priority |
|-----------|-------------|-----------------|----------|
| SCR-01 | Public Ticket Submission Form | Anonymous Citizen | P0 |
| SCR-02 | Ticket Submission Confirmation | Anonymous Citizen | P0 |
| SCR-03 | Public Ticket Status / Detail View | Anonymous / Resident | P0 |
| SCR-04 | Login / OIDC Redirect Interstitial | Authenticated Resident | P0 |
| SCR-05 | Personal Ticket History Dashboard | Authenticated Resident | P0 |
| SCR-06 | Staff Ticket Queue / List | Case Worker | P0 |
| SCR-07 | Staff Ticket Detail | Case Worker | P0 |
| SCR-08 | Staff Search (Solr) | Case Worker | P1 |
| SCR-09 | Category Admin (CRUD + Custom Field Builder) | Department Supervisor | P1 |
| SCR-10 | Department / People Admin | Department Supervisor | P1 |
| SCR-11 | API Client Management | Department Supervisor | P1 |
| SCR-12 | Bookmarks Management | Authenticated Resident | P2 |
| SCR-13 | Metrics / Reporting Dashboard | Department Supervisor | P2 |
| SCR-14 | User Profile / Account | Authenticated Resident | P0 |

### Flow Inventory

| Flow ID | Flow Name | Personas | Stories |
|---------|-----------|----------|---------|
| FLW-01 | Anonymous Ticket Submission | PER-01 | US-1.1, US-0.3 |
| FLW-02 | OIDC Login & Personal Ticket History | PER-02 | US-4.1–4.3, US-1.2 |
| FLW-03 | Staff Daily Queue — Assign, Comment, Close | PER-03 | US-1.3–1.5, US-1.7 |
| FLW-04 | Duplicate Detection & Linking | PER-03 | US-1.6 |
| FLW-05 | Category Creation with Custom Fields | PER-04 | US-10.1 |
| FLW-06 | API Client Credential Rotation | PER-04 | US-11.6 |
| FLW-07 | Bookmark Save & Recall | PER-02 | US-12.1–12.4 |

---

## Navigation Architecture

### Global Navigation (Staff)

```
[uReport Logo] [Tickets ▾] [Search] [Admin ▾] [Reports] | [User Menu ▾] [Logout]
                  └─ My Queue                 └─ Categories
                  └─ All Tickets              └─ Departments
                  └─ New Ticket               └─ People
                                              └─ API Clients
                                              └─ Sub-Statuses
                                              └─ Actions
```

### Global Navigation (Authenticated Resident)

```
[uReport Logo] [My Tickets] [Report an Issue] [Bookmarks] | [User Menu ▾] [Logout]
```

### Global Navigation (Anonymous)

```
[uReport Logo] [Report an Issue] | [Sign In]
```

### Breadcrumb Pattern

All interior pages display a breadcrumb trail:
- Admin pages: `Admin > Categories > Edit "Illegal Dumping"`
- Ticket pages: `Tickets > #84712`
- Search: `Search > Results for "pothole elm street"`

---

## Visual Language Conventions

### Role-Visibility Labels

| Label Style | Meaning | Applied To |
|-------------|---------|------------|
| 🔒 Lock icon + grey background | Staff-only field or panel | Comment field, PII fields in history |
| ✉️ Email icon + blue outline | Sends notification to reporter | Response action, Close action |
| ⚠️ Warning badge | SLA overdue | Ticket row in queue when `slaDays` exceeded |
| 🟢 Green pill | Status: Open | Ticket status badge |
| 🔴 Red pill | Status: Closed | Ticket status badge |

### State Colors

- **Primary action:** Blue (`#0070f3`)
- **Destructive action:** Red (`#e00`)
- **Success state:** Green (`#0a0`)
- **Warning / SLA exceeded:** Amber (`#f59e0b`)
- **Disabled state:** Grey (`#999`)
- **Staff-only elements:** Light blue background (`#eff6ff`)

### Typography Hierarchy

- **Page title (H1):** 24px semibold
- **Section heading (H2):** 18px semibold
- **Card title (H3):** 16px medium
- **Body text:** 14px regular
- **Label / metadata:** 12px regular, muted color
- **Code / ID:** 12px monospace
