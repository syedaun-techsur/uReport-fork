-- scripts/seed-reference-data.sql
--
-- Idempotent seed for the 5 uReport reference tables.
-- Purpose: Stand up a fresh PostgreSQL instance without migrating from a live MySQL source
--          (development / CI environments).
--
-- Usage:
--   psql "$DATABASE_URL" < scripts/seed-reference-data.sql
--
-- Safe to run multiple times: all inserts use ON CONFLICT DO NOTHING.
--
-- NOTE: This seed file is intended for fresh databases only (no MySQL migration).
-- When migrating from a live MySQL source, use scripts/migrate-mysql-to-postgres.ts instead.
-- The AdminService protects system actions (type='system') from deletion in the application.
--
-- Tables seeded:
--   version         (1 row)
--   contactMethods  (4 rows)
--   substatus       (3 rows)
--   actions         (10 rows)
--   categoryGroups  (3 rows)
--   issueTypes      (6 rows)

-- Ensure PostGIS is available (idempotent)
CREATE EXTENSION IF NOT EXISTS postgis;

-- ============================================================
-- version
-- ============================================================
INSERT INTO "version" (version) VALUES ('2.1')
  ON CONFLICT DO NOTHING;

-- ============================================================
-- contactMethods
-- GENERATED ALWAYS AS IDENTITY — do NOT specify id.
-- ON CONFLICT DO NOTHING applies to the primary key if re-run
-- after ids are already assigned; re-running on a truly empty
-- table is safe (sequences auto-assign ids 1-4).
-- ============================================================
INSERT INTO "contactMethods" (name) VALUES ('Email')     ON CONFLICT DO NOTHING;
INSERT INTO "contactMethods" (name) VALUES ('Phone')     ON CONFLICT DO NOTHING;
INSERT INTO "contactMethods" (name) VALUES ('Web Form')  ON CONFLICT DO NOTHING;
INSERT INTO "contactMethods" (name) VALUES ('Other')     ON CONFLICT DO NOTHING;

-- ============================================================
-- substatus
-- ============================================================
INSERT INTO "substatus" (status, name, description) VALUES
  ('closed', 'Resolved',  'This ticket has been taken care of')
  ON CONFLICT DO NOTHING;
INSERT INTO "substatus" (status, name, description) VALUES
  ('closed', 'Duplicate', 'This ticket is a duplicate of another ticket')
  ON CONFLICT DO NOTHING;
INSERT INTO "substatus" (status, name, description) VALUES
  ('closed', 'Bogus', 'This ticket is not actually a problem or has already been taken care of')
  ON CONFLICT DO NOTHING;

-- ============================================================
-- actions (10 system actions — verbatim from TechArch DDL §3.2)
-- ============================================================
INSERT INTO "actions" (name, type, description) VALUES
  ('open',           'system', 'Opened by {actionPerson}')                                               ON CONFLICT DO NOTHING;
INSERT INTO "actions" (name, type, description) VALUES
  ('assignment',     'system', '{enteredByPerson} assigned this case to {actionPerson}')                 ON CONFLICT DO NOTHING;
INSERT INTO "actions" (name, type, description) VALUES
  ('closed',         'system', 'Closed by {actionPerson}')                                               ON CONFLICT DO NOTHING;
INSERT INTO "actions" (name, type, description) VALUES
  ('changeCategory', 'system', 'Changed category from {original:category_id} to {updated:category_id}') ON CONFLICT DO NOTHING;
INSERT INTO "actions" (name, type, description) VALUES
  ('changeLocation', 'system', 'Changed location from {original:location} to {updated:location}')        ON CONFLICT DO NOTHING;
INSERT INTO "actions" (name, type, description) VALUES
  ('response',       'system', '{actionPerson} contacted {reportedByPerson_id}')                         ON CONFLICT DO NOTHING;
INSERT INTO "actions" (name, type, description) VALUES
  ('duplicate',      'system', '{duplicate:ticket_id} marked as a duplicate of this case.')              ON CONFLICT DO NOTHING;
INSERT INTO "actions" (name, type, description) VALUES
  ('update',         'system', '{enteredByPerson} updated this case.')                                   ON CONFLICT DO NOTHING;
INSERT INTO "actions" (name, type, description) VALUES
  ('comment',        'system', '{enteredByPerson} commented on this case.')                              ON CONFLICT DO NOTHING;
INSERT INTO "actions" (name, type, description) VALUES
  ('upload_media',   'system', '{enteredByPerson} uploaded an attachment.')                              ON CONFLICT DO NOTHING;

-- ============================================================
-- categoryGroups
-- ============================================================
INSERT INTO "categoryGroups" (name) VALUES ('Streets')    ON CONFLICT DO NOTHING;
INSERT INTO "categoryGroups" (name) VALUES ('Sanitation') ON CONFLICT DO NOTHING;
INSERT INTO "categoryGroups" (name) VALUES ('Other')      ON CONFLICT DO NOTHING;

-- ============================================================
-- issueTypes
-- ============================================================
INSERT INTO "issueTypes" (name) VALUES ('Comment')   ON CONFLICT DO NOTHING;
INSERT INTO "issueTypes" (name) VALUES ('Complaint')  ON CONFLICT DO NOTHING;
INSERT INTO "issueTypes" (name) VALUES ('Question')   ON CONFLICT DO NOTHING;
INSERT INTO "issueTypes" (name) VALUES ('Report')     ON CONFLICT DO NOTHING;
INSERT INTO "issueTypes" (name) VALUES ('Request')    ON CONFLICT DO NOTHING;
INSERT INTO "issueTypes" (name) VALUES ('Violation')  ON CONFLICT DO NOTHING;
