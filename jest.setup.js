import '@testing-library/jest-dom';

// Polyfill Request/Response for Next.js API route tests
if (typeof Request === 'undefined') {
  global.Request = class Request {
    constructor(url, init = {}) {
      // Use defineProperty so subclasses (like NextRequest) can override with getters
      Object.defineProperty(this, 'url', { value: url, writable: true, configurable: true });
      Object.defineProperty(this, 'method', { value: init.method || 'GET', writable: true, configurable: true });
      this.headers = new Map(Object.entries(init.headers || {}));
      this._body = init.body;
    }
    async json() {
      return JSON.parse(this._body || '{}');
    }
    async text() {
      return this._body || '';
    }
  };
}

if (typeof Response === 'undefined') {
  class ResponsePolyfill {
    constructor(body, init = {}) {
      // Store as both body and _body for compatibility with NextResponse
      Object.defineProperty(this, 'body', { value: body, writable: true, configurable: true });
      Object.defineProperty(this, '_body', { value: body, writable: true, configurable: true });
      Object.defineProperty(this, 'status', { value: init.status || 200, writable: true, configurable: true });
      this.headers = new Map(Object.entries(init.headers || {}));
      // Store parsed JSON for efficient retrieval
      if (init._parsedJson !== undefined) {
        this._parsedJson = init._parsedJson;
      }
    }
    async json() {
      if (this._parsedJson !== undefined) return this._parsedJson;
      return JSON.parse(this._body);
    }
    async text() {
      return typeof this._body === 'string' ? this._body : '';
    }
    static json(data, init = {}) {
      const body = JSON.stringify(data);
      const response = new ResponsePolyfill(body, { ...init, _parsedJson: data });
      return response;
    }
  }
  global.Response = ResponsePolyfill;
}

if (typeof Headers === 'undefined') {
  global.Headers = class Headers extends Map {};
}

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
    };
  },
  usePathname() {
    return '/';
  },
}));

// Mock Supabase client
jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: jest.fn().mockReturnValue({ data: { subscription: { unsubscribe: jest.fn() } } }),
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
    },
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
      order: jest.fn().mockResolvedValue({ data: [], error: null }),
    }),
  },
}));
