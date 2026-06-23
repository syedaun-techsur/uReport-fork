# STORY-MAP — uReport Re-Platform

| Field | Value |
|---|---|
| **Product** | uReport — Open311 GeoReport v2 Municipal CRM |
| **Version** | 1.0 |
| **Date** | 2026-06-23 |
| **Related PRD** | `project_specs/PRD-uReport.md` |
| **Related Personas** | `project_specs/PERSONAS-uReport.md` |
| **Related JTBD** | `project_specs/JTBD-uReport.md` |
| **Related Journeys** | `project_specs/JOURNEYS-uReport.md` |
| **Related UserStories** | `project_specs/UserStories-uReport.md` |
| **Total Stories Mapped** | 79 |
| **Status** | Active |

---

## Overview

This Story Map organizes all 79 uReport user stories along two axes:

- **X-axis (columns):** Journey stages derived from `JOURNEYS-uReport.md`, grouped by persona
- **Y-axis (rows):** User stories (US-X.Y) placed at their primary journey stage intersection

Each story entry includes a **Natural Acceptance Criterion (NaC)** derived from the intersection of:
1. A specific JTBD functional outcome (the "what matters")
2. The journey stage context (the "when/where")
3. The user story being mapped (the "what is built")

NaC are **not invented** — every NaC traces back to a documented JTBD outcome.

### Release Strategy

Stories are grouped into three releases, ordered by journey completeness:

| Release | Theme | Priority Focus | Persona Coverage |
|---|---|---|---|
| **R1 — MVP Core** | Public API + Ticket Lifecycle + Auth + DB Foundation | P0 stories | PER-01, PER-02, PER-03, PER-04 (partial) |
| **R2 — Feature Parity** | Search, Notifications, Media, Geo, Admin | P1 stories | All four personas (full workflows) |
| **R3 — Operational Excellence** | Bookmarks, Reporting, Logging, Reference Data | P2 stories | PER-03, PER-04 (depth) |

### Map ID Convention

Story map entries are referenced as `SM-{Epic}.{Story}` (e.g., `SM-0.1` = US-0.1 mapped to the story map).

---
