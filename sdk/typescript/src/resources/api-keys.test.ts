import { describe, it, expect, beforeEach, vi } from 'vitest'
import { HttpClient } from '../client.js'
import { ApiKeysResource } from './api-keys.js'
import type { ApiKeyRecord, CreateApiKeyResponse } from './api-keys.js'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

function respondWith(body: unknown, status = 200) {
  mockFetch.mockResolvedValueOnce(
    new Response(status === 204 ? null : JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json', 'x-request-id': 'req-123' },
    }),
  )
}

const sampleCreateResponse: CreateApiKeyResponse = {
  id: 'key-1',
  key: 'rsk_abc123def456',
  name: 'Production Backend',
  key_prefix: 'rsk_abc1',
  scopes: ['files:read', 'files:write'],
  mode: 'live',
}

const sampleKeyRecord: ApiKeyRecord = {
  id: 'key-1',
  name: 'Production Backend',
  key_prefix: 'rsk_abc1',
  scopes: ['files:read', 'files:write'],
  mode: 'live',
  last_used_at: '2026-01-15T12:00:00Z',
  expires_at: null,
  created_at: '2026-01-01T00:00:00Z',
}

describe('ApiKeysResource', () => {
  let http: HttpClient
  let apiKeys: ApiKeysResource

  beforeEach(() => {
    vi.clearAllMocks()
    http = new HttpClient({ apiKey: 'rsk_test', baseUrl: 'https://api.roset.dev' })
    apiKeys = new ApiKeysResource(http)
  })

  // -------------------------------------------------------------------------
  // create
  // -------------------------------------------------------------------------

  it('create sends POST /v1/org/api-keys with body', async () => {
    respondWith(sampleCreateResponse)

    const result = await apiKeys.create({
      name: 'Production Backend',
      scopes: ['files:read', 'files:write'],
      mode: 'live',
    })

    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe('https://api.roset.dev/v1/org/api-keys')
    expect(init.method).toBe('POST')
    const body = JSON.parse(init.body)
    expect(body.name).toBe('Production Backend')
    expect(body.scopes).toEqual(['files:read', 'files:write'])
    expect(body.mode).toBe('live')
    expect(result.key).toBe('rsk_abc123def456')
  })

  it('create sends minimal body (name only)', async () => {
    respondWith({ ...sampleCreateResponse, scopes: [], mode: 'live' })

    await apiKeys.create({ name: 'CI Key' })

    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.name).toBe('CI Key')
    expect(body.scopes).toBeUndefined()
    expect(body.mode).toBeUndefined()
  })

  // -------------------------------------------------------------------------
  // list
  // -------------------------------------------------------------------------

  it('list sends GET /v1/org/api-keys', async () => {
    respondWith({ api_keys: [sampleKeyRecord] })

    const result = await apiKeys.list()

    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe('https://api.roset.dev/v1/org/api-keys')
    expect(init.method).toBe('GET')
    expect(result.api_keys).toHaveLength(1)
    expect(result.api_keys[0].key_prefix).toBe('rsk_abc1')
  })

  it('list returns empty array when no keys exist', async () => {
    respondWith({ api_keys: [] })

    const result = await apiKeys.list()
    expect(result.api_keys).toEqual([])
  })

  // -------------------------------------------------------------------------
  // delete
  // -------------------------------------------------------------------------

  it('delete sends DELETE /v1/org/api-keys/{id}', async () => {
    respondWith(null, 204)

    const result = await apiKeys.delete('key-1')

    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe('https://api.roset.dev/v1/org/api-keys/key-1')
    expect(init.method).toBe('DELETE')
    expect(result).toBeUndefined()
  })
})
