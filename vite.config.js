import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';
import { handleAIRequest } from './server/aiHandler.js';

function biaiServerAIPlugin() {
  let serverEnv = {};

  const attachMiddleware = (middlewares) => {
    middlewares.use('/api/ai', (req, res) => {
      if (req.method !== 'POST') {
        res.statusCode = 405;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ ok: false, error: 'Method Not Allowed' }));
        return;
      }

      let rawBody = '';
      req.on('data', (chunk) => {
        rawBody += chunk;
        if (rawBody.length > 512 * 1024) {
          req.destroy();
        }
      });

      req.on('end', async () => {
        let parsedBody = {};
        try {
          parsedBody = rawBody ? JSON.parse(rawBody) : {};
        } catch {
          parsedBody = {};
        }

        try {
          const { status, data } = await handleAIRequest({
            body: parsedBody,
            env: serverEnv
          });
          res.statusCode = status;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(data));
        } catch (err) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({
              ok: false,
              error: err.message || 'Internal AI server error'
            })
          );
        }
      });
    });
  };

  return {
    name: 'biai-server-ai-proxy',
    configResolved(config) {
      // Load ALL env vars (empty prefix '') on the server only — never exposed to import.meta.env
      serverEnv = loadEnv(config.mode, config.root, '');
    },
    configureServer(server) {
      attachMiddleware(server.middlewares);
    },
    configurePreviewServer(server) {
      attachMiddleware(server.middlewares);
    }
  };
}

export default defineConfig({
  plugins: [react(), biaiServerAIPlugin()]
});
