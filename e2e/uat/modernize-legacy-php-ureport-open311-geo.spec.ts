import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';

test.describe('US-0.1: Browse Available Service Categories', () => {
  test('GET /open311/v2/services returns 200 with array of service objects', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/open311/v2/services`);
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(Array.isArray(body)).toBe(true);
  });

  test('Each category includes required fields: service_code, service_name, description, metadata, type, keywords, group', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/open311/v2/services`);
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(Array.isArray(body)).toBe(true);
    if (body.length > 0) {
      const service = body[0];
      expect(service).toHaveProperty('service_code');
      expect(service).toHaveProperty('service_name');
      expect(service).toHaveProperty('description');
      expect(service).toHaveProperty('metadata');
      expect(service).toHaveProperty('type');
      expect(service).toHaveProperty('keywords');
      expect(service).toHaveProperty('group');
    }
  });

  test('Response format is JSON by default', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/open311/v2/services`);
    expect(response.status()).toBe(200);
    const contentType = response.headers()['content-type'];
    expect(contentType).toContain('application/json');
  });

  test('jurisdiction_id query parameter is accepted', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/open311/v2/services?jurisdiction_id=test_jurisdiction`);
    expect(response.status()).toBe(200);
  });
});

test.describe('US-0.2: Retrieve Single Service Definition with Custom Attributes', () => {
  test('GET /open311/v2/services/1 returns 200 with service definition', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/open311/v2/services/1`);
    expect(response.status()).toBe(200);
  });

  test('GET /open311/v2/services/99999 returns 404', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/open311/v2/services/99999`);
    expect(response.status()).toBe(404);
  });
});

test.describe('US-0.3: Submit a Service Request via Open311 API', () => {
  test('POST /open311/v2/requests with missing api_key returns 403', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/open311/v2/requests`, {
      form: {
        service_code: '1',
        lat: '40.7128',
        long: '-74.006',
        address_string: '123 Main St',
      },
    });
    expect(response.status()).toBe(403);
  });

  test('POST /open311/v2/requests with invalid api_key returns 403', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/open311/v2/requests`, {
      form: {
        api_key: 'invalid-api-key-12345',
        service_code: '1',
        lat: '40.7128',
        long: '-74.006',
        address_string: '123 Main St',
      },
    });
    expect(response.status()).toBe(403);
  });
});

test.describe('US-0.4: Query Service Requests with Filters', () => {
  test('GET /open311/v2/requests returns 200 with array', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/open311/v2/requests`);
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(Array.isArray(body)).toBe(true);
  });

  test('GET /open311/v2/requests?status=open returns 200', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/open311/v2/requests?status=open`);
    expect(response.status()).toBe(200);
  });

  test('GET /open311/v2/requests?status=invalid_status returns 400', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/open311/v2/requests?status=invalid_status`);
    expect(response.status()).toBe(400);
  });
});

test.describe('US-0.5: Retrieve a Single Service Request by ID', () => {
  test('GET /open311/v2/requests/1 returns 200 with single-element array', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/open311/v2/requests/1`);
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBe(1);
  });

  test('GET /open311/v2/requests/99999 returns 404', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/open311/v2/requests/99999`);
    expect(response.status()).toBe(404);
  });
});

test.describe('US-0.6: Look Up Request ID by Submission Token', () => {
  test('GET /open311/v2/tokens/nonexistent-token returns 404', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/open311/v2/tokens/nonexistent-token`);
    expect(response.status()).toBe(404);
  });
});

test.describe('US-2.1: Anonymous Access to Public Categories and Tickets', () => {
  test('GET /open311/v2/services returns 200 without authentication', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/open311/v2/services`);
    expect(response.status()).toBe(200);
  });

  test('GET /open311/v2/requests returns 200 without authentication', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/open311/v2/requests`);
    expect(response.status()).toBe(200);
  });
});

test.describe('US-3.1: Request JSON Response via URL Suffix', () => {
  test('GET /open311/v2/services.json returns 200 with JSON content-type', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/open311/v2/services.json`);
    expect(response.status()).toBe(200);
    const contentType = response.headers()['content-type'];
    expect(contentType).toContain('application/json');
  });
});

test.describe('US-3.2: Request XML Response via URL Suffix', () => {
  test('GET /open311/v2/services.xml returns 200 with XML content', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/open311/v2/services.xml`);
    expect(response.status()).toBe(200);
    const contentType = response.headers()['content-type'];
    expect(contentType).toMatch(/xml/);
  });
});

test.describe('US-4.1: OIDC Login Redirect', () => {
  test('GET /auth/login returns redirect (302) or 200', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/auth/login`, {
      maxRedirects: 0,
    });
    expect([200, 302, 301]).toContain(response.status());
  });
});

test.describe('US-4.4: Logout Endpoint', () => {
  test('GET /auth/logout returns 200 or 302', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/auth/logout`, {
      maxRedirects: 0,
    });
    expect([200, 302, 301]).toContain(response.status());
  });
});

test.describe('US-1.1: Submit Service Request via API without auth', () => {
  test('POST /open311/v2/requests without api_key returns 403', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/open311/v2/requests`, {
      form: {
        service_code: '1',
        lat: '40.7128',
        long: '-74.006',
      },
    });
    expect(response.status()).toBe(403);
  });
});

test.describe('US-2.3: Staff Access Protected Routes', () => {
  test('GET /categories returns 401 or 403 without authentication', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/categories`);
    expect([401, 403]).toContain(response.status());
  });

  test('GET /departments returns 401 or 403 without authentication', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/departments`);
    expect([401, 403]).toContain(response.status());
  });
});

test.describe('US-5.1: Full-Text Search', () => {
  test('GET /search?q=pothole returns 200 or 503 (Solr may be unavailable)', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/search?q=pothole`);
    expect([200, 503]).toContain(response.status());
  });
});

test.describe('US-13.1: Metrics Dashboard', () => {
  test('GET /metrics returns 401 or 403 without authentication (staff-only)', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/metrics`);
    expect([401, 403]).toContain(response.status());
  });
});

test.describe('US-16.1: Bookmarks', () => {
  test('GET /bookmarks returns 401 or 403 without authentication (requires login)', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/bookmarks`);
    expect([401, 403]).toContain(response.status());
  });
});
