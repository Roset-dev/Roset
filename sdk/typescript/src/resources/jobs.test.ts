import { describe, it, expect, beforeEach, vi } from 'vitest'
import { HttpClient } from '../client.js'
import { JobsResource } from './jobs.js'
import type { JobRecord, ListJobsResponse } from './jobs.js'

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

const sampleJob: JobRecord = {
  id: 'j-1',
  file_id: 'f-1',
  space: 'default',
  status: 'completed',
  provider: 'reducto',
  config: '{}',
  error: null,
  error_code: null,
  retries: 0,
  processing_duration_ms: 1500,
  created_at: '2026-01-01T00:00:00Z',
  started_at: '2026-01-01T00:00:01Z',
  completed_at: '2026-01-01T00:00:02Z',
}

describe('JobsResource', () => {
  let http: HttpClient
  let jobs: JobsResource

  beforeEach(() => {
    vi.clearAllMocks()
    http = new HttpClient({ apiKey: 'rsk_test', baseUrl: 'https://api.roset.dev' })
    jobs = new JobsResource(http)
  })

  // -------------------------------------------------------------------------
  // list
  // -------------------------------------------------------------------------

  it('list sends GET /v1/jobs with no params', async () => {
    const mockResponse: ListJobsResponse = { jobs: [sampleJob], next_cursor: null }
    respondWith(mockResponse)

    const result = await jobs.list()

    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe('https://api.roset.dev/v1/jobs')
    expect(init.method).toBe('GET')
    expect(result.jobs).toHaveLength(1)
  })

  it('list sends all query params when provided', async () => {
    respondWith({ jobs: [], next_cursor: null })

    await jobs.list({ space: 'acme', status: 'failed', limit: 50, cursor: 'cur-x' })

    const [url] = mockFetch.mock.calls[0]
    const parsed = new URL(url)
    expect(parsed.searchParams.get('space')).toBe('acme')
    expect(parsed.searchParams.get('status')).toBe('failed')
    expect(parsed.searchParams.get('limit')).toBe('50')
    expect(parsed.searchParams.get('cursor')).toBe('cur-x')
  })

  it('list omits unset optional params', async () => {
    respondWith({ jobs: [], next_cursor: null })

    await jobs.list({ status: 'processing' })

    const [url] = mockFetch.mock.calls[0]
    const parsed = new URL(url)
    expect(parsed.searchParams.has('space')).toBe(false)
    expect(parsed.searchParams.get('status')).toBe('processing')
    expect(parsed.searchParams.has('limit')).toBe(false)
  })

  // -------------------------------------------------------------------------
  // get
  // -------------------------------------------------------------------------

  it('get sends GET /v1/jobs/{id}', async () => {
    respondWith(sampleJob)

    const result = await jobs.get('j-1')

    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe('https://api.roset.dev/v1/jobs/j-1')
    expect(init.method).toBe('GET')
    expect(result.id).toBe('j-1')
    expect(result.provider).toBe('reducto')
  })

  // -------------------------------------------------------------------------
  // cancel
  // -------------------------------------------------------------------------

  it('cancel sends POST /v1/jobs/{id}/cancel', async () => {
    const cancelled = { ...sampleJob, status: 'cancelled' }
    respondWith(cancelled)

    const result = await jobs.cancel('j-1')

    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe('https://api.roset.dev/v1/jobs/j-1/cancel')
    expect(init.method).toBe('POST')
    expect(result.status).toBe('cancelled')
  })

  // -------------------------------------------------------------------------
  // retry
  // -------------------------------------------------------------------------

  it('retry sends POST /v1/jobs/{id}/retry', async () => {
    const retried = { ...sampleJob, status: 'queued', retries: 1 }
    respondWith(retried)

    const result = await jobs.retry('j-1')

    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe('https://api.roset.dev/v1/jobs/j-1/retry')
    expect(init.method).toBe('POST')
    expect(result.status).toBe('queued')
    expect(result.retries).toBe(1)
  })

  it('retry returns updated job record', async () => {
    respondWith({ ...sampleJob, status: 'queued', retries: 2 })

    const result = await jobs.retry('j-1')
    expect(result.retries).toBe(2)
  })
})
