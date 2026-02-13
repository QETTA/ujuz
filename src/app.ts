import fastify from 'fastify';

import { connectMongo } from './lib/db';
import { ensureIndexes } from './lib/ensureIndexes';
import { errorHandler } from './lib/errors';
import { registerAdmissionRoutes } from './api/v1/admission';
import { registerAnonRoutes } from './api/v1/anon';
import { registerCommunityRoutes } from './api/v1/community';
import { registerStatusRoutes } from './api/v1/status';
import { registerToAlertsRoutes } from './api/v1/toAlerts';

export async function createServer() {
  const app = fastify({ logger: true });

  app.setErrorHandler(errorHandler);

  const db = await connectMongo();
  await ensureIndexes(db);

  await registerStatusRoutes(app);
  await registerAnonRoutes(app);
  await registerAdmissionRoutes(app);
  await registerToAlertsRoutes(app);
  await registerCommunityRoutes(app);

  app.get('/', async () => ({
    message: 'UjuZ API emulator is running',
    endpoints: [
      '/status',
      '/api/v1/status',
      '/api/v1/anon/session',
      '/api/v1/admission/calc',
      '/api/v1/admission/explain',
      '/api/v1/to-alerts',
      '/api/v1/community/posts',
    ],
    version: '1.0.0',
  }));

  return app;
}
