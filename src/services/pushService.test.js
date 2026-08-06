import { createPushService } from './pushService.js';

function mockResponse({ ok = true, status = 200, payload = {} } = {}) {
  return {
    ok,
    status,
    json: jest.fn().mockResolvedValue(payload),
  };
}

describe('pushService HTTP contract', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  test('uses the configured API URL and returns status data', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      mockResponse({ payload: { active: true, found: true } })
    );
    const service = createPushService('https://api.example.test/');

    const result = await service.checkStatus({ farmId: 123, deviceId: 'device-1', type: 'web' });

    expect(result).toEqual({ success: true, data: { active: true, found: true }, error: null });
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.example.test/subscription-status',
      expect.objectContaining({ method: 'POST' })
    );
  });

  test('does not report an HTTP error as a successful FCM subscription', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      mockResponse({ ok: false, status: 500, payload: { error: 'Database unavailable' } })
    );
    const service = createPushService('');

    const result = await service.subscribeFCM(
      { value: 'fcm-token' },
      { farmId: 123, deviceId: 'device-1' }
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe('Database unavailable');
  });

  test('surfaces rate-limit errors from preference updates', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      mockResponse({ ok: false, status: 429, payload: { code: 'RATE_LIMITED', error: 'Too many requests' } })
    );
    const service = createPushService('');

    const result = await service.updateNotifList({ farmId: 123, deviceId: 'device-1' });

    expect(result).toEqual({ success: false, error: 'Too many requests' });
  });
});

