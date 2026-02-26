import { describe, it, expect, beforeEach, vi } from 'vitest'
import { HttpClient } from '../client.js'
import { SpacesResource } from './spaces.js'
import type { SpaceRecord } from './spaces.js'

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

describe('SpacesResource', () => {
  let http: HttpClient
  let spaces: SpacesResource

  beforeEach(() => {
    vi.clearAllMocks()
    http = new HttpClient({ apiKey: 'rsk_test', baseUrl: 'https://api.roset.dev' })
    spaces = new SpacesResource(http)
  })

  // -------------------------------------------------------------------------
  // list
  // -------------------------------------------------------------------------

  it('list sends GET /v1/spaces', async () => {
    const mockSpaces: SpaceRecord[] = [
      { space: 'default', file_count: 42 },
      { space: 'acme-corp', file_count: 10 },
    ]
    respondWith({ spaces: mockSpaces })

    const result = await spaces.list()

    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe('https://api.roset.dev/v1/spaces')
    expect(init.method).toBe('GET')
    expect(result.spaces).toHaveLength(2)
    expect(result.spaces[0].space).toBe('default')
    expect(result.spaces[0].file_count).toBe(42)
  })

  it('list returns empty array when no spaces exist', async () => {
    respondWith({ spaces: [] })

    const result = await spaces.list()
    expect(result.spaces).toEqual([])
  })

  // -------------------------------------------------------------------------
  // getStats
  // -------------------------------------------------------------------------

  it('getStats sends GET /v1/spaces/{encodedName}/stats', async () => {
    const stats = { file_count: 42, total_size_bytes: 1048576, completed: 40, failed: 2 }
    respondWith(stats)

    const result = await spaces.getStats('acme-corp')

    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe('https://api.roset.dev/v1/spaces/acme-corp/stats')
    expect(init.method).toBe('GET')
    expect(result).toEqual(stats)
  })

  it('getStats URL-encodes the space name', async () => {
    respondWith({ file_count: 5 })

    await spaces.getStats('my space/sub')

    const [url] = mockFetch.mock.calls[0]
    expect(url).toBe('https://api.roset.dev/v1/spaces/my%20space%2Fsub/stats')
  })

  it('getStats URL-encodes special characters', async () => {
    respondWith({ file_count: 1 })

    await spaces.getStats('tenant#1')

    const [url] = mockFetch.mock.calls[0]
    expect(url).toContain('tenant%231')
  })
})
