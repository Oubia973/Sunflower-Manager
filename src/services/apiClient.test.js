import { ApiHttpError, buildApiUrl, fetchJson } from './apiClient.js';

function response({ ok = true, status = 200, payload = {}, contentType = 'application/json' } = {}) {
  return {
    ok,
    status,
    headers: { get: jest.fn().mockReturnValue(contentType) },
    json: jest.fn().mockResolvedValue(payload),
    text: jest.fn().mockResolvedValue(typeof payload === 'string' ? payload : JSON.stringify(payload)),
  };
}

describe('apiClient', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  test('builds same-origin and configured API URLs', () => {
    expect(buildApiUrl('', '/getfarm')).toBe('/getfarm');
    expect(buildApiUrl('https://api.example.test/', 'getfarm')).toBe('https://api.example.test/getfarm');
  });

  test('serializes JSON requests and parses JSON responses', async () => {
    global.fetch = jest.fn().mockResolvedValue(response({ payload: { ok: true } }));

    const result = await fetchJson('https://api.example.test', '/route', {
      method: 'POST',
      body: { farmId: 123 },
      timeoutMs: 0,
    });

    expect(result).toEqual({ ok: true });
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.example.test/route',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ farmId: 123 }),
        headers: { 'Content-Type': 'application/json' },
      })
    );
  });

  test('throws a structured error for non-success responses', async () => {
    global.fetch = jest.fn().mockResolvedValue(response({
      ok: false,
      status: 429,
      payload: { error: 'Too many requests', code: 'RATE_LIMITED', retryAfterMs: 1000 },
    }));

    const request = fetchJson('', '/route', { timeoutMs: 0 });
    await expect(request).rejects.toMatchObject({
      name: 'ApiHttpError',
      status: 429,
      code: 'RATE_LIMITED',
      retryAfterMs: 1000,
    });
    await expect(request).rejects.toBeInstanceOf(ApiHttpError);
  });

  test('preserves a plain-text backend error message', async () => {
    global.fetch = jest.fn().mockResolvedValue(response({
      ok: false,
      status: 500,
      payload: 'Error, refresh your page',
      contentType: 'text/plain',
    }));

    await expect(fetchJson('', '/legacy-route', { timeoutMs: 0 })).rejects.toMatchObject({
      status: 500,
      message: 'Error, refresh your page',
    });
  });

  test('keeps the timeout active while the response body is read', async () => {
    global.fetch = jest.fn().mockImplementation((_url, init) => Promise.resolve({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: () => new Promise((_resolve, reject) => {
        init.signal.addEventListener('abort', () => {
          const error = new Error('aborted');
          error.name = 'AbortError';
          reject(error);
        }, { once: true });
      }),
    }));

    await expect(fetchJson('', '/slow-body', { timeoutMs: 5 })).rejects.toMatchObject({
      code: 'REQUEST_TIMEOUT',
      message: 'Request timed out',
    });
  });
});
