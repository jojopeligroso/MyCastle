// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Ensure NODE_ENV is set to 'test' for Jest environment
process.env.NODE_ENV = 'test';

// Remove DEV_AUTH_BYPASS to ensure tests run without auth bypass
delete process.env.DEV_AUTH_BYPASS;

// Mock next/headers for API route tests
// This prevents "cookies was called outside a request scope" errors
jest.mock('next/headers', () => ({
  cookies: jest.fn(() => ({
    get: jest.fn(() => null),
    getAll: jest.fn(() => []),
    set: jest.fn(),
    delete: jest.fn(),
    has: jest.fn(() => false),
  })),
  headers: jest.fn(() => ({
    get: jest.fn(() => null),
    has: jest.fn(() => false),
    entries: jest.fn(() => []),
    forEach: jest.fn(),
  })),
}));

// Mock @supabase/ssr for server-side Supabase client creation
jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
      getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
    })),
  })),
}));

// Note: Auth utilities are NOT globally mocked - let each test file handle its own mocks
// to avoid interference between tests. Tests should mock @/lib/auth/utils as needed.

if (typeof global.Request === 'undefined') {
  class HeadersPolyfill {
    constructor(init = {}) {
      this.map = new Map(Object.entries(init));
    }
    get(name) {
      return this.map.get(name.toLowerCase()) || null;
    }
    set(name, value) {
      this.map.set(name.toLowerCase(), String(value));
    }
    entries() {
      return this.map.entries();
    }
  }

  class RequestPolyfill {
    constructor(input, init = {}) {
      this._url = typeof input === 'string' ? input : input.url;
      this.method = init.method || 'GET';
      this.headers = new HeadersPolyfill(init.headers || {});
      this.body = init.body;
    }
    get url() {
      return this._url;
    }
  }

  class ResponsePolyfill {
    constructor(body = null, init = {}) {
      this.body = body;
      this.status = init.status || 200;
      this.headers = new HeadersPolyfill(init.headers || {});
    }
    static json(data, init = {}) {
      const headers = { 'content-type': 'application/json', ...(init.headers || {}) };
      return new ResponsePolyfill(JSON.stringify(data), { ...init, headers });
    }
    async json() {
      if (this.body === null || this.body === undefined) return null;
      if (typeof this.body === 'string') return JSON.parse(this.body);
      return this.body;
    }
    async text() {
      if (this.body === null || this.body === undefined) return '';
      return typeof this.body === 'string' ? this.body : JSON.stringify(this.body);
    }
  }

  global.Headers = HeadersPolyfill;
  global.Request = RequestPolyfill;
  global.Response = ResponsePolyfill;
}
