export class ApiHttpError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'ApiHttpError';
    this.status = Number(details.status || 0);
    this.code = String(details.code || '');
    this.retryAfterMs = Number(details.retryAfterMs || 0);
    this.payload = details.payload ?? null;
  }
}

export function buildApiUrl(apiUrl, endpoint) {
  const base = String(apiUrl || '').replace(/\/$/, '');
  const path = String(endpoint || '');
  if (/^https?:\/\//i.test(path)) return path;
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

async function readResponsePayload(response) {
  const contentType = String(response?.headers?.get?.('content-type') || '').toLowerCase();
  try {
    if (contentType.includes('application/json')) return await response.json();
    const text = await response.text();
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  } catch (error) {
    if (error?.name === 'AbortError') throw error;
    return null;
  }
}

export async function fetchJson(apiUrl, endpoint, options = {}) {
  const {
    body,
    headers = {},
    timeoutMs = 20_000,
    signal,
    ...fetchOptions
  } = options;
  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  let timedOut = false;
  let timeoutId = null;
  let removeAbortListener = null;

  if (controller && signal) {
    const forwardAbort = () => controller.abort(signal.reason);
    if (signal.aborted) forwardAbort();
    else {
      signal.addEventListener('abort', forwardAbort, { once: true });
      removeAbortListener = () => signal.removeEventListener('abort', forwardAbort);
    }
  }
  if (controller && Number(timeoutMs) > 0) {
    timeoutId = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, Number(timeoutMs));
  }

  const requestHeaders = { ...headers };
  let requestBody = body;
  const isFormData = typeof FormData === 'function' && body instanceof FormData;
  if (body !== undefined && body !== null && typeof body !== 'string' && !isFormData) {
    requestBody = JSON.stringify(body);
    if (!Object.keys(requestHeaders).some((key) => key.toLowerCase() === 'content-type')) {
      requestHeaders['Content-Type'] = 'application/json';
    }
  }

  try {
    const response = await fetch(buildApiUrl(apiUrl, endpoint), {
      ...fetchOptions,
      headers: requestHeaders,
      body: requestBody,
      ...(controller ? { signal: controller.signal } : signal ? { signal } : {}),
    });
    const payload = await readResponsePayload(response);
    if (!response.ok) {
      const message = typeof payload === 'string'
        ? payload
        : payload?.error || payload?.message || `HTTP ${response.status}`;
      throw new ApiHttpError(String(message), {
        status: response.status,
        code: payload?.code,
        retryAfterMs: payload?.retryAfterMs,
        payload,
      });
    }
    return payload;
  } catch (error) {
    if (timedOut || error?.name === 'AbortError') {
      throw new ApiHttpError(timedOut ? 'Request timed out' : 'Request cancelled', {
        code: timedOut ? 'REQUEST_TIMEOUT' : 'REQUEST_CANCELLED',
      });
    }
    throw error;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
    if (removeAbortListener) removeAbortListener();
  }
}
