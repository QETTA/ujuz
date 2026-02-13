import { expect, test } from '@playwright/test';

test('chat stream responds', async ({ request }) => {
  const response = await request.post('/api/bot/chat/stream', {
    data: {
      messages: [
        {
          id: '1',
          role: 'user',
          parts: [{
            type: 'text',
            text: '서울 강남구 어린이집 추천해줘',
          }],
        },
      ],
    },
    headers: {
      'Content-Type': 'application/json',
      'x-device-id': '00000000-0000-4000-8000-000000000001',
    },
  });

  expect(response.status()).toBe(200);
  const body = await response.text();
  expect(body).toBeTruthy();
});
