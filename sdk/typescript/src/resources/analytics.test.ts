import { describe, it, expect, beforeEach, vi } from 'vitest'
import { HttpClient } from '../client.js'
import { AnalyticsResource } from './analytics.js'

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

describe('AnalyticsResource', () => {
  let http: HttpClient
  let analytics: AnalyticsResource

  beforeEach(() => {
    vi.clearAllMocks()
    http = new HttpClient({ apiKey: 'rsk_test', baseUrl: 'https://api.roset.dev' })
    analytics = new AnalyticsResource(http)
  })

  // -------------------------------------------------------------------------
  // overview
  // -------------------------------------------------------------------------

  it('overview sends GET /v1/analytics/overview', async () => {
    const data = { total_files: 100, active_jobs: 5, completed_jobs: 90 }
    respondWith(data)

    const result = await analytics.overview()

    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe('https://api.roset.dev/v1/analytics/overview')
    expect(init.method).toBe('GET')
    expect(result).toEqual(data)
  })

  // -------------------------------------------------------------------------
  // processing
  // -------------------------------------------------------------------------

  it('processing sends GET /v1/analytics/processing with no days param', async () => {
    respondWith({ avg_time_ms: 2000, success_rate: 0.95 })

    await analytics.processing()

    const [url] = mockFetch.mock.calls[0]
    expect(url).toBe('https://api.roset.dev/v1/analytics/processing')
  })

  it('processing sends days query param when provided', async () => {
    respondWith({ avg_time_ms: 1500 })

    await analytics.processing(7)

    const [url] = mockFetch.mock.calls[0]
    const parsed = new URL(url)
    expect(parsed.searchParams.get('days')).toBe('7')
  })

  // -------------------------------------------------------------------------
  // fileTypes
  // -------------------------------------------------------------------------

  it('fileTypes sends GET /v1/analytics/file-types', async () => {
    respondWith({ types: [{ content_type: 'application/pdf', count: 50 }] })

    const result = await analytics.fileTypes()

    const [url] = mockFetch.mock.calls[0]
    expect(url).toBe('https://api.roset.dev/v1/analytics/file-types')
    expect(result).toHaveProperty('types')
  })

  // -------------------------------------------------------------------------
  // spaces
  // -------------------------------------------------------------------------

  it('spaces sends GET /v1/analytics/spaces', async () => {
    respondWith({ spaces: [{ space: 'default', file_count: 100 }] })

    await analytics.spaces()

    const [url] = mockFetch.mock.calls[0]
    expect(url).toBe('https://api.roset.dev/v1/analytics/spaces')
  })

  // -------------------------------------------------------------------------
  // failures
  // -------------------------------------------------------------------------

  it('failures sends GET /v1/analytics/failures with optional limit', async () => {
    respondWith({ failures: [] })

    await analytics.failures(10)

    const [url] = mockFetch.mock.calls[0]
    const parsed = new URL(url)
    expect(parsed.pathname).toBe('/v1/analytics/failures')
    expect(parsed.searchParams.get('limit')).toBe('10')
  })

  it('failures omits limit when not provided', async () => {
    respondWith({ failures: [] })

    await analytics.failures()

    const [url] = mockFetch.mock.calls[0]
    expect(url).toBe('https://api.roset.dev/v1/analytics/failures')
  })

  // -------------------------------------------------------------------------
  // volume
  // -------------------------------------------------------------------------

  it('volume sends GET /v1/analytics/volume with optional days', async () => {
    respondWith({ daily: [] })

    await analytics.volume(30)

    const [url] = mockFetch.mock.calls[0]
    const parsed = new URL(url)
    expect(parsed.pathname).toBe('/v1/analytics/volume')
    expect(parsed.searchParams.get('days')).toBe('30')
  })

  // -------------------------------------------------------------------------
  // trends
  // -------------------------------------------------------------------------

  it('trends sends GET /v1/analytics/trends with optional days', async () => {
    respondWith({ points: [] })

    await analytics.trends(14)

    const [url] = mockFetch.mock.calls[0]
    const parsed = new URL(url)
    expect(parsed.pathname).toBe('/v1/analytics/trends')
    expect(parsed.searchParams.get('days')).toBe('14')
  })

  // -------------------------------------------------------------------------
  // providers
  // -------------------------------------------------------------------------

  it('providers sends GET /v1/analytics/providers with optional days', async () => {
    respondWith({ providers: [{ name: 'reducto', jobs: 80 }] })

    await analytics.providers(7)

    const [url] = mockFetch.mock.calls[0]
    const parsed = new URL(url)
    expect(parsed.pathname).toBe('/v1/analytics/providers')
    expect(parsed.searchParams.get('days')).toBe('7')
  })

  // -------------------------------------------------------------------------
  // topFailures
  // -------------------------------------------------------------------------

  it('topFailures sends GET /v1/analytics/top-failures with optional limit', async () => {
    respondWith({ failures: [{ error_code: 'TIMEOUT', count: 15 }] })

    await analytics.topFailures(5)

    const [url] = mockFetch.mock.calls[0]
    const parsed = new URL(url)
    expect(parsed.pathname).toBe('/v1/analytics/top-failures')
    expect(parsed.searchParams.get('limit')).toBe('5')
  })

  it('topFailures omits limit when not provided', async () => {
    respondWith({ failures: [] })

    await analytics.topFailures()

    const [url] = mockFetch.mock.calls[0]
    expect(url).toBe('https://api.roset.dev/v1/analytics/top-failures')
  })

  // -------------------------------------------------------------------------
  // storageGrowth
  // -------------------------------------------------------------------------

  it('storageGrowth sends GET /v1/analytics/storage-growth with optional days', async () => {
    respondWith({ points: [{ date: '2026-01-01', total_bytes: 1048576 }] })

    await analytics.storageGrowth(90)

    const [url] = mockFetch.mock.calls[0]
    const parsed = new URL(url)
    expect(parsed.pathname).toBe('/v1/analytics/storage-growth')
    expect(parsed.searchParams.get('days')).toBe('90')
  })

  it('storageGrowth omits days when not provided', async () => {
    respondWith({ points: [] })

    await analytics.storageGrowth()

    const [url] = mockFetch.mock.calls[0]
    expect(url).toBe('https://api.roset.dev/v1/analytics/storage-growth')
  })
})
