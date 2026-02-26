import { describe, it, expect, beforeEach, vi } from 'vitest'
import { HttpClient } from '../client.js'
import { ProviderKeysResource } from './provider-keys.js'
import type { ProviderKeyRecord } from './provider-keys.js'

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

const sampleKeys: ProviderKeyRecord[] = [
  { provider: 'reducto', configured: true, updated_at: '2026-01-01T00:00:00Z' },
  { provider: 'openai', configured: true, updated_at: '2026-01-02T00:00:00Z' },
  { provider: 'gemini', configured: false, updated_at: null },
  { provider: 'whisper', configured: false, updated_at: null },
]

describe('ProviderKeysResource', () => {
  let http: HttpClient
  let providerKeys: ProviderKeysResource

  beforeEach(() => {
    vi.clearAllMocks()
    http = new HttpClient({ apiKey: 'rsk_test', baseUrl: 'https://api.roset.dev' })
    providerKeys = new ProviderKeysResource(http)
  })

  // -------------------------------------------------------------------------
  // set
  // -------------------------------------------------------------------------

  it('set sends PUT /v1/org/provider-keys with provider and key', async () => {
    respondWith({ success: true })

    const result = await providerKeys.set({ provider: 'openai', key: 'sk-abc123' })

    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe('https://api.roset.dev/v1/org/provider-keys')
    expect(init.method).toBe('PUT')
    const body = JSON.parse(init.body)
    expect(body.provider).toBe('openai')
    expect(body.key).toBe('sk-abc123')
    expect(result.success).toBe(true)
  })

  it('set works for all supported providers', async () => {
    for (const provider of ['reducto', 'openai', 'gemini', 'whisper']) {
      vi.clearAllMocks()
      respondWith({ success: true })
      await providerKeys.set({ provider, key: `key-${provider}` })
      const body = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(body.provider).toBe(provider)
    }
  })

  // -------------------------------------------------------------------------
  // get
  // -------------------------------------------------------------------------

  it('get sends GET /v1/org/provider-keys', async () => {
    respondWith({ keys: sampleKeys })

    const result = await providerKeys.get()

    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe('https://api.roset.dev/v1/org/provider-keys')
    expect(init.method).toBe('GET')
    expect(result.keys).toHaveLength(4)
    expect(result.keys[0].configured).toBe(true)
    expect(result.keys[2].configured).toBe(false)
  })

  // -------------------------------------------------------------------------
  // delete
  // -------------------------------------------------------------------------

  it('delete sends DELETE /v1/org/provider-keys/{encodedProvider}', async () => {
    respondWith(null, 204)

    const result = await providerKeys.delete('openai')

    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe('https://api.roset.dev/v1/org/provider-keys/openai')
    expect(init.method).toBe('DELETE')
    expect(result).toBeUndefined()
  })

  it('delete URL-encodes the provider name', async () => {
    respondWith(null, 204)

    await providerKeys.delete('my provider')

    const [url] = mockFetch.mock.calls[0]
    expect(url).toBe('https://api.roset.dev/v1/org/provider-keys/my%20provider')
  })
})
