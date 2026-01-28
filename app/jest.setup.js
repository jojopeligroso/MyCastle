// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

delete process.env.DEV_AUTH_BYPASS;

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
