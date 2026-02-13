import { expect, test } from '@playwright/test';

test('payment initiate requires auth', async ({ request }) => {
  const response = await request.post('/api/v1/payments/initiate');
  expect(response.status()).toBe(401);
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

test('export requires auth', async ({ request }) => {
  const response = await request.get('/api/v1/export');
  expect(response.status()).toBe(401);
});

test('admin stats requires key', async ({ request }) => {
  const response = await request.get('/api/v1/admin/stats');
  expect(response.status()).toBe(401);
});
