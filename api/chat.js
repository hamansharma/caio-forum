// In-memory rate limit store
// Resets when Vercel spins up a new instance (typically every few hours)
const rateLimitStore = new Map();

const RATE_LIMIT = {
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 10,           // max 20 requests per IP per hour
  maxBodySize: 50000,        // max ~50KB payload
  maxMessages: 10,           // max conversation turns
};

function getClientIp(req) {
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.headers['x-real-ip'] ||
    req.socket?.remoteAddress ||
    'unknown'
  );
}

function isRateLimited(ip) {
  const now = Date.now();
  const record = rateLimitStore.get(ip);

  if (!record || now > record.resetAt) {
    rateLimitStore.set(ip, { count: 1, resetAt: now + RATE_LIMIT.windowMs });
    return false;
  }

  if (record.count >= RATE_LIMIT.maxRequests) {
    return true;
  }

  record.count += 1;
  return false;
}

function getRateLimitInfo(ip) {
  const record = rateLimitStore.get(ip);
  if (!record) return { remaining: RATE_LIMIT.maxRequests, resetAt: null };
  return {
    remaining: Math.max(0, RATE_LIMIT.maxRequests - record.count),
    resetAt: new Date(record.resetAt).toISOString(),
  };
}

function validateRequest(body, rawSize) {
  if (rawSize > RATE_LIMIT.maxBodySize) {
    return 'Request payload too large.';
  }
  if (!body.messages || !Array.isArray(body.messages)) {
    return 'Invalid request: messages must be an array.';
  }
  if (body.messages.length > RATE_LIMIT.maxMessages) {
    return `Too many messages in conversation (max ${RATE_LIMIT.maxMessages}).`;
  }
  if (!body.system || typeof body.system !== 'string') {
    return 'Invalid request: system prompt missing.';
  }
  if (body.system.length > 100000) {
    return 'System prompt too large.';
  }
  for (const msg of body.messages) {
    if (!msg.role || !msg.content) return 'Invalid message format.';
    if (!['user', 'assistant'].includes(msg.role)) return 'Invalid message role.';
    if (typeof msg.content !== 'string') return 'Message content must be a string.';
    if (msg.content.length > 20000) return 'Individual message too long.';
  }
  return null;
}

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check API key exists
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('ANTHROPIC_API_KEY not configured');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  // Get client IP
  const ip = getClientIp(req);

  // Check rate limit
  if (isRateLimited(ip)) {
    const info = getRateLimitInfo(ip);
    return res.status(429).json({
      error: `Too many requests. You have used your ${RATE_LIMIT.maxRequests} message limit for this hour. Resets at ${info.resetAt}.`,
    });
  }

  // Validate request body
  const rawSize = JSON.stringify(req.body).length;
  const validationError = validateRequest(req.body, rawSize);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  const { messages, system } = req.body;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        system,
        messages,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Anthropic API error:', error);
      return res.status(response.status).json({
        error: error.error?.message || 'Failed to get response.',
      });
    }

    const data = await response.json();

    // Add rate limit info to response headers
    const info = getRateLimitInfo(ip);
    res.setHeader('X-RateLimit-Remaining', info.remaining);
    res.setHeader('X-RateLimit-Reset', info.resetAt || '');

    return res.status(200).json(data);

  } catch (err) {
    console.error('Server error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}