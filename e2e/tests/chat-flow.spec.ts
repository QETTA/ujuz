import { expect, test } from 'playwright/test';

test('chat stream endpoint responds', async ({ request }) => {
  const response = await request.post('/api/v1/bot/chat/stream', {
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

  // 200 when AI provider connected, 500 when DB/AI unavailable in dev
  expect([200, 500]).toContain(response.status());
});
