// Vercel Serverless Function wrapper for /api/ai
// Keeps OPENROUTER_API_KEY strictly on the server in production deployments.

import { handleAIRequest } from '../server/aiHandler.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'Method Not Allowed. Use POST.' });
    return;
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  }

  const { status, data } = await handleAIRequest({
    body,
    env: process.env
  });

  res.status(status).json(data);
}

