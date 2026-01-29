/**
 * Authentication Middleware
 * Provides API key authentication for protected endpoints
 */

// Admin API key from environment
const ADMIN_API_KEY = process.env.ADMIN_API_KEY;

// Optional: list of read-only API keys for higher rate limits
const API_KEYS = new Set<string>(
  (process.env.API_KEYS || '').split(',').filter(Boolean)
);

export type AuthLevel = 'public' | 'authenticated' | 'admin';

export interface AuthResult {
  authenticated: boolean;
  level: AuthLevel;
  apiKey?: string;
}

/**
 * Extract API key from request headers
 * Supports both Authorization: Bearer <key> and X-API-Key: <key>
 */
export function extractApiKey(request: Request): string | null {
  // Check Authorization header first
  const authHeader = request.headers.get('authorization');
  if (authHeader) {
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    if (match) {
      return match[1];
    }
  }

  // Check X-API-Key header
  const apiKeyHeader = request.headers.get('x-api-key');
  if (apiKeyHeader) {
    return apiKeyHeader;
  }

  return null;
}

/**
 * Authenticate a request and determine access level
 */
export function authenticate(request: Request): AuthResult {
  const apiKey = extractApiKey(request);

  if (!apiKey) {
    return { authenticated: false, level: 'public' };
  }

  // Check for admin key
  if (ADMIN_API_KEY && apiKey === ADMIN_API_KEY) {
    return { authenticated: true, level: 'admin', apiKey };
  }

  // Check for regular API key
  if (API_KEYS.has(apiKey)) {
    return { authenticated: true, level: 'authenticated', apiKey };
  }

  // Invalid key
  return { authenticated: false, level: 'public' };
}

/**
 * Check if request has admin access
 */
export function isAdmin(request: Request): boolean {
  const auth = authenticate(request);
  return auth.level === 'admin';
}

/**
 * Check if request has at least authenticated access
 */
export function isAuthenticated(request: Request): boolean {
  const auth = authenticate(request);
  return auth.level === 'authenticated' || auth.level === 'admin';
}

/**
 * Create an unauthorized response
 */
export function createUnauthorizedResponse(message: string = 'Unauthorized'): Response {
  return new Response(
    JSON.stringify({ error: message }),
    {
      status: 401,
      headers: {
        'Content-Type': 'application/json',
        'WWW-Authenticate': 'Bearer',
      },
    }
  );
}

/**
 * Create a forbidden response
 */
export function createForbiddenResponse(message: string = 'Forbidden'): Response {
  return new Response(
    JSON.stringify({ error: message }),
    {
      status: 403,
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
}

/**
 * Require admin authentication for a request
 */
export function requireAdmin(request: Request): Response | null {
  if (!ADMIN_API_KEY) {
    // No admin key configured - allow in development, block in production
    if (process.env.NODE_ENV === 'production') {
      return createForbiddenResponse('Admin access not configured');
    }
    return null; // Allow in development
  }

  if (!isAdmin(request)) {
    const auth = authenticate(request);
    if (!auth.authenticated) {
      return createUnauthorizedResponse('Admin API key required');
    }
    return createForbiddenResponse('Admin access required');
  }

  return null; // Allow
}

/**
 * Require at least authenticated access for a request
 */
export function requireAuthenticated(request: Request): Response | null {
  if (!isAuthenticated(request)) {
    return createUnauthorizedResponse('API key required');
  }
  return null; // Allow
}
