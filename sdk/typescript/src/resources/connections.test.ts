import { describe, it, expect, beforeEach, vi } from 'vitest'
import { HttpClient } from '../client.js'
import { ConnectionsResource } from './connections.js'
import type { ConnectionRecord } from './connections.js'

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

const sampleConnection: ConnectionRecord = {
  id: 'conn-1',
  name: 'Production S3',
  provider: 's3',
  bucket_name: 'my-bucket',
  region: 'us-east-1',
  base_prefix: '',
  endpoint: null,
  status: 'active',
  last_sync_at: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

describe('ConnectionsResource', () => {
  let http: HttpClient
  let connections: ConnectionsResource

  beforeEach(() => {
    vi.clearAllMocks()
    http = new HttpClient({ apiKey: 'rsk_test', baseUrl: 'https://api.roset.dev' })
    connections = new ConnectionsResource(http)
  })

  // -------------------------------------------------------------------------
  // create
  // -------------------------------------------------------------------------

  it('create sends POST /v1/connections with body', async () => {
    respondWith(sampleConnection)

    const result = await connections.create({
      name: 'Production S3',
      provider: 's3',
      bucket_name: 'my-bucket',
      region: 'us-east-1',
    })

    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe('https://api.roset.dev/v1/connections')
    expect(init.method).toBe('POST')
    const body = JSON.parse(init.body)
    expect(body.name).toBe('Production S3')
    expect(body.provider).toBe('s3')
    expect(body.bucket_name).toBe('my-bucket')
    expect(result.id).toBe('conn-1')
  })

  it('create includes optional fields (endpoint, credentials)', async () => {
    respondWith({ ...sampleConnection, provider: 'minio', endpoint: 'http://minio:9000' })

    await connections.create({
      name: 'MinIO Dev',
      provider: 'minio',
      bucket_name: 'dev-bucket',
      endpoint: 'http://minio:9000',
      credentials: { access_key: 'minioadmin', secret_key: 'minioadmin' },
    })

    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.endpoint).toBe('http://minio:9000')
    expect(body.credentials).toEqual({ access_key: 'minioadmin', secret_key: 'minioadmin' })
  })

  // -------------------------------------------------------------------------
  // list
  // -------------------------------------------------------------------------

  it('list sends GET /v1/connections', async () => {
    respondWith({ connections: [sampleConnection] })

    const result = await connections.list()

    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe('https://api.roset.dev/v1/connections')
    expect(init.method).toBe('GET')
    expect(result.connections).toHaveLength(1)
  })

  // -------------------------------------------------------------------------
  // get
  // -------------------------------------------------------------------------

  it('get sends GET /v1/connections/{id}', async () => {
    respondWith(sampleConnection)

    const result = await connections.get('conn-1')

    const [url] = mockFetch.mock.calls[0]
    expect(url).toBe('https://api.roset.dev/v1/connections/conn-1')
    expect(result.provider).toBe('s3')
  })

  // -------------------------------------------------------------------------
  // delete
  // -------------------------------------------------------------------------

  it('delete sends DELETE /v1/connections/{id}', async () => {
    respondWith(null, 204)

    const result = await connections.delete('conn-1')

    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe('https://api.roset.dev/v1/connections/conn-1')
    expect(init.method).toBe('DELETE')
    expect(result).toBeUndefined()
  })

  // -------------------------------------------------------------------------
  // test
  // -------------------------------------------------------------------------

  it('test sends POST /v1/connections/{id}/test', async () => {
    respondWith({ success: true, message: 'Connection OK' })

    const result = await connections.test('conn-1')

    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe('https://api.roset.dev/v1/connections/conn-1/test')
    expect(init.method).toBe('POST')
    expect(result.success).toBe(true)
    expect(result.message).toBe('Connection OK')
  })

  // -------------------------------------------------------------------------
  // sync
  // -------------------------------------------------------------------------

  it('sync sends POST /v1/connections/{id}/sync', async () => {
    respondWith({ status: 'syncing' })

    const result = await connections.sync('conn-1')

    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe('https://api.roset.dev/v1/connections/conn-1/sync')
    expect(init.method).toBe('POST')
    expect(result.status).toBe('syncing')
  })

  // -------------------------------------------------------------------------
  // enumerate
  // -------------------------------------------------------------------------

  it('enumerate sends GET /v1/connections/{id}/enumerate with no params', async () => {
    respondWith({ objects: [] })

    await connections.enumerate('conn-1')

    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe('https://api.roset.dev/v1/connections/conn-1/enumerate')
    expect(init.method).toBe('GET')
  })

  it('enumerate sends prefix and limit query params', async () => {
    respondWith({ objects: [{ key: 'docs/file.pdf', size: 1024 }] })

    await connections.enumerate('conn-1', { prefix: 'docs/', limit: 100 })

    const [url] = mockFetch.mock.calls[0]
    const parsed = new URL(url)
    expect(parsed.searchParams.get('prefix')).toBe('docs/')
    expect(parsed.searchParams.get('limit')).toBe('100')
  })
})
