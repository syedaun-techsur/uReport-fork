/**
 * serialization.interceptor.spec.ts
 *
 * Tests for:
 *   1. FormatMiddleware.resolve() — all 4 priority levels
 *   2. JsonSerializer.serialize()
 *   3. XmlSerializer.serialize()
 *   4. CsvSerializer.serialize()
 *   5. TxtSerializer.serialize()
 *
 * These tests verify byte-compatible output per FRD F03.3–F03.6.
 * Full snapshot tests against legacy PHP output will run in Wave 4 integration tests.
 */

import { FormatMiddleware } from '../middleware/format.middleware';
import { JsonSerializer } from '../serializers/json.serializer';
import { XmlSerializer } from '../serializers/xml.serializer';
import { CsvSerializer } from '../serializers/csv.serializer';
import { TxtSerializer } from '../serializers/txt.serializer';
import type { Request } from 'express';

// ---- helpers ----------------------------------------------------------------
function makeReq(
  overrides: Partial<{
    path: string;
    query: Record<string, string>;
    headers: Record<string, string>;
  }> = {},
): Partial<Request> {
  return {
    path: overrides.path ?? '/',
    query: overrides.query ?? {},
    headers: overrides.headers ?? {},
  };
}

// ---- FormatMiddleware -------------------------------------------------------

describe('FormatMiddleware.resolve()', () => {
  // Priority 1: URL suffix
  test('returns json for .json suffix', () => {
    expect(FormatMiddleware.resolve(makeReq({ path: '/tickets.json' }) as Request)).toBe('json');
  });
  test('returns xml for .xml suffix', () => {
    expect(FormatMiddleware.resolve(makeReq({ path: '/tickets.xml' }) as Request)).toBe('xml');
  });
  test('returns csv for .csv suffix', () => {
    expect(FormatMiddleware.resolve(makeReq({ path: '/tickets.csv' }) as Request)).toBe('csv');
  });
  test('returns txt for .txt suffix', () => {
    expect(FormatMiddleware.resolve(makeReq({ path: '/tickets.txt' }) as Request)).toBe('txt');
  });

  // Priority 2: ?format= param
  test('returns xml for ?format=xml (no suffix)', () => {
    expect(FormatMiddleware.resolve(makeReq({ path: '/tickets', query: { format: 'xml' } }) as Request)).toBe('xml');
  });
  test('returns html for ?format=html', () => {
    expect(FormatMiddleware.resolve(makeReq({ path: '/tickets', query: { format: 'html' } }) as Request)).toBe('html');
  });

  // Priority 3: Accept header
  test('returns json for Accept: application/json (no suffix, no param)', () => {
    expect(FormatMiddleware.resolve(makeReq({ headers: { accept: 'application/json' } }) as Request)).toBe('json');
  });
  test('returns xml for Accept: application/xml', () => {
    expect(FormatMiddleware.resolve(makeReq({ headers: { accept: 'application/xml' } }) as Request)).toBe('xml');
  });
  test('returns csv for Accept: text/csv', () => {
    expect(FormatMiddleware.resolve(makeReq({ headers: { accept: 'text/csv' } }) as Request)).toBe('csv');
  });
  test('returns txt for Accept: text/plain', () => {
    expect(FormatMiddleware.resolve(makeReq({ headers: { accept: 'text/plain' } }) as Request)).toBe('txt');
  });
  test('returns html for Accept: text/html', () => {
    expect(FormatMiddleware.resolve(makeReq({ headers: { accept: 'text/html' } }) as Request)).toBe('html');
  });

  // Priority 4: Default
  test('defaults to json for Open311 routes', () => {
    expect(FormatMiddleware.resolve(makeReq({ path: '/open311/v2/services' }) as Request)).toBe('json');
  });
  test('defaults to html for non-Open311 routes', () => {
    expect(FormatMiddleware.resolve(makeReq({ path: '/tickets' }) as Request)).toBe('html');
  });

  // Suffix beats Accept header
  test('suffix overrides Accept header', () => {
    const req = makeReq({ path: '/tickets.xml', headers: { accept: 'application/json' } }) as Request;
    expect(FormatMiddleware.resolve(req)).toBe('xml');
  });
  // Suffix beats ?format=
  test('suffix overrides ?format= param', () => {
    const req = makeReq({ path: '/tickets.csv', query: { format: 'json' } }) as Request;
    expect(FormatMiddleware.resolve(req)).toBe('csv');
  });
  // ?format= beats Accept header
  test('?format= overrides Accept header', () => {
    const req = makeReq({ path: '/tickets', query: { format: 'txt' }, headers: { accept: 'application/json' } }) as Request;
    expect(FormatMiddleware.resolve(req)).toBe('txt');
  });
});

// ---- JsonSerializer --------------------------------------------------------

describe('JsonSerializer', () => {
  const s = new JsonSerializer();

  test('serializes array to JSON array string', () => {
    const result = s.serialize([{ id: 1, name: 'Pothole' }]);
    expect(JSON.parse(result)).toEqual([{ id: 1, name: 'Pothole' }]);
  });

  test('preserves null values (not omitted)', () => {
    const result = s.serialize({ description: null, notes: null });
    expect(JSON.parse(result)).toEqual({ description: null, notes: null });
  });

  test('serializes booleans as true/false not 1/0', () => {
    const result = s.serialize({ active: true, featured: false });
    expect(result).toContain('true');
    expect(result).toContain('false');
    expect(result).not.toContain('"active":1');
  });

  test('serializes Date to ISO 8601 UTC string', () => {
    const d = new Date('2024-01-15T14:30:00.000Z');
    const result = s.serialize({ enteredDate: d });
    expect(JSON.parse(result)).toEqual({ enteredDate: '2024-01-15T14:30:00.000Z' });
  });

  test('empty array serializes to []', () => {
    expect(s.serialize([])).toBe('[]');
  });
});

// ---- XmlSerializer ---------------------------------------------------------

describe('XmlSerializer', () => {
  const s = new XmlSerializer();

  test('includes XML declaration', () => {
    const result = s.serialize({}, 'item');
    expect(result).toMatch(/^<\?xml version="1\.0" encoding="UTF-8"\?>/);
  });

  test('wraps description in CDATA', () => {
    const result = s.serialize({ description: 'A pothole on Main St' }, 'ticket');
    expect(result).toContain('<![CDATA[A pothole on Main St]]>');
  });

  test('wraps notes in CDATA', () => {
    const result = s.serialize({ notes: 'Staff note here' }, 'history');
    expect(result).toContain('<![CDATA[Staff note here]]>');
  });

  test('renders null as empty self-closing tag', () => {
    const result = s.serialize({ closedDate: null }, 'ticket');
    expect(result).toContain('<closedDate/>');
  });

  test('escapes & in non-CDATA fields', () => {
    const result = s.serialize({ name: 'Cats & Dogs' }, 'category');
    expect(result).toContain('&amp;');
  });

  test('renders boolean as true/false string', () => {
    const result = s.serialize({ active: true }, 'category');
    expect(result).toContain('<active>true</active>');
  });

  test('services array uses service as child tag', () => {
    const result = s.serialize([{ service_code: 1 }], 'services');
    expect(result).toContain('<services>');
    expect(result).toContain('<service>');
    expect(result).toContain('</services>');
  });

  test('service_requests array uses request as child tag', () => {
    const result = s.serialize([{ service_request_id: 42 }], 'service_requests');
    expect(result).toContain('<service_requests>');
    expect(result).toContain('<request>');
  });
});

// ---- CsvSerializer ---------------------------------------------------------

describe('CsvSerializer', () => {
  const s = new CsvSerializer();

  test('output starts with UTF-8 BOM', () => {
    const result = s.serialize([{ id: 1 }]);
    expect(result.charCodeAt(0)).toBe(0xef);
    expect(result.charCodeAt(1)).toBe(0xbb);
    expect(result.charCodeAt(2)).toBe(0xbf);
  });

  test('first row is header row with column names', () => {
    const result = s.serialize([{ id: 1, name: 'Pothole' }]);
    const lines = result.slice(3).split('\r\n'); // skip BOM
    expect(lines[0]).toBe('"id","name"');
  });

  test('booleans are serialized as 1/0 not true/false', () => {
    const result = s.serialize([{ active: true, featured: false }]);
    const lines = result.slice(3).split('\r\n');
    expect(lines[1]).toBe('1,0');
  });

  test('strings are double-quoted', () => {
    const result = s.serialize([{ name: 'Pothole' }]);
    expect(result).toContain('"Pothole"');
  });

  test('null values produce empty quoted string', () => {
    const result = s.serialize([{ description: null }]);
    const lines = result.slice(3).split('\r\n');
    expect(lines[1]).toBe('""');
  });

  test('dates are ISO 8601', () => {
    const d = new Date('2024-01-15T14:30:00.000Z');
    const result = s.serialize([{ enteredDate: d }]);
    expect(result).toContain('2024-01-15T14:30:00.000Z');
  });

  test('empty array returns only BOM', () => {
    const result = s.serialize([]);
    expect(result).toBe(CsvSerializer.BOM);
  });

  test('embedded newlines become \\n within quoted field', () => {
    const result = s.serialize([{ notes: 'line one\nline two' }]);
    expect(result).toContain('"line one\\nline two"');
  });
});

// ---- TxtSerializer ---------------------------------------------------------

describe('TxtSerializer', () => {
  const s = new TxtSerializer();

  test('produces tab-separated values', () => {
    const result = s.serialize([{ id: 1, name: 'Pothole', status: 'open' }]);
    expect(result).toBe('1\tPothole\topen');
  });

  test('no header row', () => {
    const result = s.serialize([{ id: 1, name: 'Pothole' }]);
    // Should not contain a line that looks like column names
    expect(result).not.toContain('id\tname');
  });

  test('multiple records produce multiple lines', () => {
    const result = s.serialize([
      { id: 1, name: 'Pothole' },
      { id: 2, name: 'Graffiti' },
    ]);
    const lines = result.split('\n');
    expect(lines).toHaveLength(2);
    expect(lines[0]).toBe('1\tPothole');
    expect(lines[1]).toBe('2\tGraffiti');
  });

  test('null values produce empty string field', () => {
    const result = s.serialize([{ id: 1, description: null }]);
    expect(result).toBe('1\t');
  });

  test('booleans are 1/0', () => {
    const result = s.serialize([{ active: true, featured: false }]);
    expect(result).toBe('1\t0');
  });
});
