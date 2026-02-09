import { describe, it, expect, beforeEach, vi } from 'vitest'
import { RosetClient, HttpClient } from './client.js'
import { RosetError, NotFoundError, ServerError } from './errors.js'
import { FilesResource } from './resources/files.js'
import { JobsResource } from './resources/jobs.js'
import { ConnectionsResource } from './resources/connections.js'
import { NodesResource } from './resources/nodes.js'
import { WebhooksResource } from './resources/webhooks.js'
import { SpacesResource } from './resources/spaces.js'
import { ApiKeysResource } from './resources/api-keys.js'
import { ProviderKeysResource } from './resources/provider-keys.js'
import { AnalyticsResource } from './resources/analytics.js'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

function respondWith(body: unknown, status = 200) {
  mockFetch.mockResolvedValueOnce(
    new Response(status === 204 ? null : JSON.stringify(body), {
      status,
      headers: {
        'Content-Type': 'application/json',
        'x-request-id': 'req-123',
      },
    }),
  )
}

// ---------------------------------------------------------------------------
// RosetClient initialization
// ---------------------------------------------------------------------------

describe('RosetClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('throws if neither apiKey nor getAccessToken is provided', () => {
    expect(() => new RosetClient({})).toThrow(RosetError)
    expect(() => new RosetClient({})).toThrow('apiKey or getAccessToken is required')
  })

  it('initializes with apiKey', () => {
    const client = new RosetClient({ apiKey: 'rsk_test' })
    expect(client).toBeDefined()
  })

  it('initializes with getAccessToken', () => {
    const client = new RosetClient({ getAccessToken: async () => 'tok' })
    expect(client).toBeDefined()
  })

  it('initializes with custom baseUrl', () => {
    const client = new RosetClient({ apiKey: 'rsk_test', baseUrl: 'http://localhost:8787' })
    expect(client).toBeDefined()
  })

  // Resource properties

  it('exposes files as FilesResource', () => {
    const client = new RosetClient({ apiKey: 'rsk_test' })
    expect(client.files).toBeInstanceOf(FilesResource)
  })

  it('exposes jobs as JobsResource', () => {
    const client = new RosetClient({ apiKey: 'rsk_test' })
    expect(client.jobs).toBeInstanceOf(JobsResource)
  })

  it('exposes connections as ConnectionsResource', () => {
    const client = new RosetClient({ apiKey: 'rsk_test' })
    expect(client.connections).toBeInstanceOf(ConnectionsResource)
  })

  it('exposes nodes as NodesResource', () => {
    const client = new RosetClient({ apiKey: 'rsk_test' })
    expect(client.nodes).toBeInstanceOf(NodesResource)
  })

  it('exposes webhooks as WebhooksResource', () => {
    const client = new RosetClient({ apiKey: 'rsk_test' })
    expect(client.webhooks).toBeInstanceOf(WebhooksResource)
  })

  it('exposes spaces as SpacesResource', () => {
    const client = new RosetClient({ apiKey: 'rsk_test' })
    expect(client.spaces).toBeInstanceOf(SpacesResource)
  })

  it('exposes apiKeys as ApiKeysResource', () => {
    const client = new RosetClient({ apiKey: 'rsk_test' })
    expect(client.apiKeys).toBeInstanceOf(ApiKeysResource)
  })

  it('exposes providerKeys as ProviderKeysResource', () => {
    const client = new RosetClient({ apiKey: 'rsk_test' })
    expect(client.providerKeys).toBeInstanceOf(ProviderKeysResource)
  })

  it('exposes analytics as AnalyticsResource', () => {
    const client = new RosetClient({ apiKey: 'rsk_test' })
    expect(client.analytics).toBeInstanceOf(AnalyticsResource)
  })
})

// ---------------------------------------------------------------------------
// HttpClient
// ---------------------------------------------------------------------------

describe('HttpClient', () => {
  let http: HttpClient

  beforeEach(() => {
    vi.clearAllMocks()
    http = new HttpClient({ apiKey: 'rsk_test', baseUrl: 'https://api.roset.dev' })
  })

  // Auth headers

  it('sends ApiKey authorization header for apiKey config', async () => {
    respondWith({ ok: true })
    await http.get('/v1/health')
    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe('https://api.roset.dev/v1/health')
    expect(init.headers['Authorization']).toBe('ApiKey rsk_test')
  })

  it('sends Bearer authorization header for getAccessToken config', async () => {
    const httpBearer = new HttpClient({
      getAccessToken: async () => 'jwt-token-123',
      baseUrl: 'https://api.roset.dev',
    })
    respondWith({ ok: true })
    await httpBearer.get('/v1/health')
    const [, init] = mockFetch.mock.calls[0]
    expect(init.headers['Authorization']).toBe('Bearer jwt-token-123')
  })

  it('omits auth header when getAccessToken returns null', async () => {
    const httpNoAuth = new HttpClient({
      getAccessToken: async () => null,
      baseUrl: 'https://api.roset.dev',
    })
    respondWith({ ok: true })
    await httpNoAuth.get('/v1/health')
    const [, init] = mockFetch.mock.calls[0]
    expect(init.headers['Authorization']).toBeUndefined()
  })

  // HTTP methods

  it('sends GET request', async () => {
    respondWith({ data: 1 })
    const result = await http.get('/v1/files')
    expect(mockFetch).toHaveBeenCalledOnce()
    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe('https://api.roset.dev/v1/files')
    expect(init.method).toBe('GET')
    expect(init.body).toBeUndefined()
    expect(result).toEqual({ data: 1 })
  })

  it('sends POST request with JSON body', async () => {
    respondWith({ id: 'new' })
    const body = { filename: 'test.pdf', size_bytes: 1024 }
    await http.post('/v1/upload', body)
    const [, init] = mockFetch.mock.calls[0]
    expect(init.method).toBe('POST')
    expect(init.body).toBe(JSON.stringify(body))
    expect(init.headers['Content-Type']).toBe('application/json')
  })

  it('sends PUT request with JSON body', async () => {
    respondWith({ success: true })
    await http.put('/v1/org/provider-keys', { provider: 'openai', key: 'sk-...' })
    const [, init] = mockFetch.mock.calls[0]
    expect(init.method).toBe('PUT')
    expect(init.headers['Content-Type']).toBe('application/json')
  })

  it('sends PATCH request with JSON body', async () => {
    respondWith({ id: 'node-1', name: 'renamed' })
    await http.patch('/v1/nodes/node-1', { name: 'renamed' })
    const [, init] = mockFetch.mock.calls[0]
    expect(init.method).toBe('PATCH')
  })

  it('sends DELETE request', async () => {
    respondWith(null, 204)
    await http.delete('/v1/files/abc')
    const [, init] = mockFetch.mock.calls[0]
    expect(init.method).toBe('DELETE')
    expect(init.body).toBeUndefined()
  })

  // Query params

  it('serializes query params into URL', async () => {
    respondWith({ files: [] })
    await http.get('/v1/files', { space: 'acme', status: 'completed', limit: '10' })
    const [url] = mockFetch.mock.calls[0]
    const parsed = new URL(url)
    expect(parsed.searchParams.get('space')).toBe('acme')
    expect(parsed.searchParams.get('status')).toBe('completed')
    expect(parsed.searchParams.get('limit')).toBe('10')
  })

  it('filters out null, undefined, and empty string from query params', async () => {
    respondWith({ files: [] })
    await http.get('/v1/files', {
      space: 'default',
      status: undefined as unknown as string,
      limit: null as unknown as string,
      cursor: '',
    })
    const [url] = mockFetch.mock.calls[0]
    const parsed = new URL(url)
    expect(parsed.searchParams.get('space')).toBe('default')
    expect(parsed.searchParams.has('status')).toBe(false)
    expect(parsed.searchParams.has('limit')).toBe(false)
    expect(parsed.searchParams.has('cursor')).toBe(false)
  })

  // 204 No Content

  it('returns undefined for 204 No Content', async () => {
    respondWith(null, 204)
    const result = await http.delete('/v1/files/abc')
    expect(result).toBeUndefined()
  })

  // Error handling

  it('throws typed error on non-OK response', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'Not found', code: 'NOT_FOUND' }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          'x-request-id': 'req-456',
        },
      }),
    )
    await expect(http.get('/v1/files/missing')).rejects.toThrow(NotFoundError)
  })

  it('extracts requestId from x-request-id header on error', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'Oops' }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'x-request-id': 'req-trace-789',
        },
      }),
    )
    try {
      await http.get('/v1/fail')
      expect.unreachable('should have thrown')
    } catch (err) {
      expect(err).toBeInstanceOf(ServerError)
      expect((err as ServerError).requestId).toBe('req-trace-789')
    }
  })

  it('handles non-JSON error body gracefully', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response('Internal Server Error', {
        status: 500,
        statusText: 'Internal Server Error',
        headers: { 'x-request-id': 'req-bad' },
      }),
    )
    try {
      await http.get('/v1/broken')
      expect.unreachable('should have thrown')
    } catch (err) {
      expect(err).toBeInstanceOf(ServerError)
      // Falls back to res.statusText since JSON parsing fails
      expect((err as ServerError).message).toBe('Internal Server Error')
    }
  })

  // Base URL

  it('uses default base URL when none provided', async () => {
    const httpDefault = new HttpClient({ apiKey: 'rsk_test' })
    respondWith({ ok: true })
    await httpDefault.get('/v1/health')
    const [url] = mockFetch.mock.calls[0]
    expect(url).toBe('https://api.roset.dev/v1/health')
  })

  it('strips trailing slash from base URL', async () => {
    const httpSlash = new HttpClient({ apiKey: 'rsk_test', baseUrl: 'https://api.roset.dev/' })
    respondWith({ ok: true })
    await httpSlash.get('/v1/health')
    const [url] = mockFetch.mock.calls[0]
    expect(url).toBe('https://api.roset.dev/v1/health')
  })
})
