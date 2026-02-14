import { expect, test } from 'playwright/test';

test('payment initiate rejects empty body', async ({ request }) => {
  const response = await request.post('/api/v1/payments/initiate');
  // AUTH_BYPASS=true in dev → 400 (missing body); production → 401 (no auth)
  expect([400, 401]).toContain(response.status());
});

test('payment initiate validates body', async ({ request }) => {
  const response = await request.post('/api/v1/payments/initiate', {
    headers: {
      'x-device-id': '00000000-0000-4000-8000-000000000001',
      'Content-Type': 'application/json',
    },
  });

  expect(response.status()).toBe(400);
});

test('export requires auth or rejects', async ({ request }) => {
  const response = await request.get('/api/v1/export');
  expect(response.ok()).toBe(false);
});

test('admin stats requires key', async ({ request }) => {
  const response = await request.get('/api/v1/admin/stats');
  expect(response.status()).toBe(401);
});
