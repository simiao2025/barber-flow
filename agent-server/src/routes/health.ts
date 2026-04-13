// ============================================================
// BARBEAR-FLOW: Health Check
// ============================================================

import { Hono } from 'hono';
import { messageQueue } from '../lib/queue.js';

export const healthRoute = new Hono();

/**
 * GET /health
 * Health check do servidor
 */
healthRoute.get('/', (c) => {
  return c.json(
    {
      status: 'ok',
      uptime: process.uptime(),
      queue: {
        size: messageQueue.size,
        activeProcessing: messageQueue.activeProcessing,
      },
      timestamp: new Date().toISOString(),
    },
    200
  );
});
