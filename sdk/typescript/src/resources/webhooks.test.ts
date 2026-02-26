import { describe, it, expect, beforeEach, vi } from 'vitest'
import { HttpClient } from '../client.js'
import { WebhooksResource } from './webhooks.js'
import type { WebhookRecord, WebhookDeliveryRecord } from './webhooks.js'

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

const sampleWebhook: WebhookRecord = {
  id: 'wh-1',
  url: 'https://example.com/webhook',
  events: 'file.created,job.completed',
  enabled: 1,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

const sampleDelivery: WebhookDeliveryRecord = {
  id: 'del-1',
  webhook_id: 'wh-1',
  event_type: 'job.completed',
  payload: '{"job_id":"j-1"}',
  status: 'delivered',
  attempts: 1,
  response_code: 200,
  created_at: '2026-01-01T00:00:00Z',
}

describe('WebhooksResource', () => {
  let http: HttpClient
  let webhooks: WebhooksResource

  beforeEach(() => {
    vi.clearAllMocks()
    http = new HttpClient({ apiKey: 'rsk_test', baseUrl: 'https://api.roset.dev' })
    webhooks = new WebhooksResource(http)
  })

  // -------------------------------------------------------------------------
  // create
  // -------------------------------------------------------------------------

  it('create sends POST /v1/webhooks with url and events', async () => {
    respondWith(sampleWebhook)

    const result = await webhooks.create({
      url: 'https://example.com/webhook',
      events: ['file.created', 'job.completed'],
    })

    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe('https://api.roset.dev/v1/webhooks')
    expect(init.method).toBe('POST')
    const body = JSON.parse(init.body)
    expect(body.url).toBe('https://example.com/webhook')
    expect(body.events).toEqual(['file.created', 'job.completed'])
    expect(result.id).toBe('wh-1')
  })

  // -------------------------------------------------------------------------
  // list
  // -------------------------------------------------------------------------

  it('list sends GET /v1/webhooks', async () => {
    respondWith({ webhooks: [sampleWebhook] })

    const result = await webhooks.list()

    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe('https://api.roset.dev/v1/webhooks')
    expect(init.method).toBe('GET')
    expect(result.webhooks).toHaveLength(1)
  })

  // -------------------------------------------------------------------------
  // get
  // -------------------------------------------------------------------------

  it('get sends GET /v1/webhooks/{id}', async () => {
    respondWith(sampleWebhook)

    const result = await webhooks.get('wh-1')

    const [url] = mockFetch.mock.calls[0]
    expect(url).toBe('https://api.roset.dev/v1/webhooks/wh-1')
    expect(result.url).toBe('https://example.com/webhook')
  })

  // -------------------------------------------------------------------------
  // update
  // -------------------------------------------------------------------------

  it('update sends PATCH /v1/webhooks/{id} with partial fields', async () => {
    const updated = { ...sampleWebhook, url: 'https://new.example.com/hook' }
    respondWith(updated)

    const result = await webhooks.update('wh-1', { url: 'https://new.example.com/hook' })

    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe('https://api.roset.dev/v1/webhooks/wh-1')
    expect(init.method).toBe('PATCH')
    const body = JSON.parse(init.body)
    expect(body.url).toBe('https://new.example.com/hook')
    expect(result.url).toBe('https://new.example.com/hook')
  })

  it('update can set enabled and events', async () => {
    respondWith({ ...sampleWebhook, enabled: false, events: 'job.failed' })

    await webhooks.update('wh-1', {
      enabled: false,
      events: ['job.failed'],
    })

    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.enabled).toBe(false)
    expect(body.events).toEqual(['job.failed'])
  })

  // -------------------------------------------------------------------------
  // delete
  // -------------------------------------------------------------------------

  it('delete sends DELETE /v1/webhooks/{id}', async () => {
    respondWith(null, 204)

    const result = await webhooks.delete('wh-1')

    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe('https://api.roset.dev/v1/webhooks/wh-1')
    expect(init.method).toBe('DELETE')
    expect(result).toBeUndefined()
  })

  // -------------------------------------------------------------------------
  // listDeliveries
  // -------------------------------------------------------------------------

  it('listDeliveries sends GET /v1/webhooks/{id}/deliveries with no params', async () => {
    respondWith({ deliveries: [sampleDelivery], next_cursor: null })

    const result = await webhooks.listDeliveries('wh-1')

    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe('https://api.roset.dev/v1/webhooks/wh-1/deliveries')
    expect(init.method).toBe('GET')
    expect(result.deliveries).toHaveLength(1)
    expect(result.deliveries[0].event_type).toBe('job.completed')
  })

  it('listDeliveries sends limit and cursor query params', async () => {
    respondWith({ deliveries: [], next_cursor: null })

    await webhooks.listDeliveries('wh-1', { limit: 10, cursor: 'del-cur' })

    const [url] = mockFetch.mock.calls[0]
    const parsed = new URL(url)
    expect(parsed.searchParams.get('limit')).toBe('10')
    expect(parsed.searchParams.get('cursor')).toBe('del-cur')
  })

  // -------------------------------------------------------------------------
  // test
  // -------------------------------------------------------------------------

  it('test sends POST /v1/webhooks/{id}/test', async () => {
    respondWith({ success: true })

    const result = await webhooks.test('wh-1')

    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe('https://api.roset.dev/v1/webhooks/wh-1/test')
    expect(init.method).toBe('POST')
    expect(result.success).toBe(true)
  })

  it('test returns failure result', async () => {
    respondWith({ success: false })

    const result = await webhooks.test('wh-bad')
    expect(result.success).toBe(false)
  })
})
