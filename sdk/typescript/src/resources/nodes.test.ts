import { describe, it, expect, beforeEach, vi } from 'vitest'
import { HttpClient } from '../client.js'
import { NodesResource } from './nodes.js'
import type { NodeRecord, ListNodesResponse } from './nodes.js'

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

const sampleNode: NodeRecord = {
  id: 'n-1',
  connection_id: 'conn-1',
  parent_id: null,
  type: 'file',
  name: 'report.pdf',
  storage_key: 'files/report.pdf',
  size_bytes: 4096,
  content_type: 'application/pdf',
  etag: '"abc123"',
  status: 'active',
  space: 'default',
  metadata: '{}',
  file_hash: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
}

describe('NodesResource', () => {
  let http: HttpClient
  let nodes: NodesResource

  beforeEach(() => {
    vi.clearAllMocks()
    http = new HttpClient({ apiKey: 'rsk_test', baseUrl: 'https://api.roset.dev' })
    nodes = new NodesResource(http)
  })

  // -------------------------------------------------------------------------
  // list
  // -------------------------------------------------------------------------

  it('list sends GET /v1/nodes with no params', async () => {
    const mockResponse: ListNodesResponse = { nodes: [sampleNode], next_cursor: null }
    respondWith(mockResponse)

    const result = await nodes.list()

    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe('https://api.roset.dev/v1/nodes')
    expect(init.method).toBe('GET')
    expect(result.nodes).toHaveLength(1)
  })

  it('list sends all query params when provided', async () => {
    respondWith({ nodes: [], next_cursor: null })

    await nodes.list({
      connection_id: 'conn-1',
      parent_id: 'n-parent',
      status: 'active',
      space: 'acme',
      type: 'file',
      limit: 20,
      cursor: 'cur-abc',
    })

    const [url] = mockFetch.mock.calls[0]
    const parsed = new URL(url)
    expect(parsed.searchParams.get('connection_id')).toBe('conn-1')
    expect(parsed.searchParams.get('parent_id')).toBe('n-parent')
    expect(parsed.searchParams.get('status')).toBe('active')
    expect(parsed.searchParams.get('space')).toBe('acme')
    expect(parsed.searchParams.get('type')).toBe('file')
    expect(parsed.searchParams.get('limit')).toBe('20')
    expect(parsed.searchParams.get('cursor')).toBe('cur-abc')
  })

  it('list sends parent_id=null as the string "null" for root-level nodes', async () => {
    respondWith({ nodes: [], next_cursor: null })

    await nodes.list({ parent_id: null })

    const [url] = mockFetch.mock.calls[0]
    const parsed = new URL(url)
    expect(parsed.searchParams.get('parent_id')).toBe('null')
  })

  // -------------------------------------------------------------------------
  // get
  // -------------------------------------------------------------------------

  it('get sends GET /v1/nodes/{id}', async () => {
    respondWith(sampleNode)

    const result = await nodes.get('n-1')

    const [url] = mockFetch.mock.calls[0]
    expect(url).toBe('https://api.roset.dev/v1/nodes/n-1')
    expect(result.name).toBe('report.pdf')
  })

  // -------------------------------------------------------------------------
  // delete
  // -------------------------------------------------------------------------

  it('delete sends DELETE /v1/nodes/{id}', async () => {
    respondWith(null, 204)

    const result = await nodes.delete('n-1')

    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe('https://api.roset.dev/v1/nodes/n-1')
    expect(init.method).toBe('DELETE')
    expect(result).toBeUndefined()
  })

  // -------------------------------------------------------------------------
  // download
  // -------------------------------------------------------------------------

  it('download sends GET /v1/nodes/{id}/download', async () => {
    respondWith({ url: 'https://bucket.s3.amazonaws.com/signed-download' })

    const result = await nodes.download('n-1')

    const [url] = mockFetch.mock.calls[0]
    expect(url).toBe('https://api.roset.dev/v1/nodes/n-1/download')
    expect(result.url).toContain('signed-download')
  })

  // -------------------------------------------------------------------------
  // upload
  // -------------------------------------------------------------------------

  it('upload sends POST /v1/connections/{connectionId}/upload', async () => {
    respondWith({ node: sampleNode, upload_url: 'https://bucket/upload-signed' })

    const result = await nodes.upload('conn-1', {
      filename: 'new-file.pdf',
      content_type: 'application/pdf',
      size_bytes: 8192,
    })

    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe('https://api.roset.dev/v1/connections/conn-1/upload')
    expect(init.method).toBe('POST')
    const body = JSON.parse(init.body)
    expect(body.filename).toBe('new-file.pdf')
    expect(body.content_type).toBe('application/pdf')
    expect(result.upload_url).toContain('upload-signed')
  })

  // -------------------------------------------------------------------------
  // move
  // -------------------------------------------------------------------------

  it('move sends PATCH /v1/nodes/{id} with parent_id and name', async () => {
    const moved = { ...sampleNode, parent_id: 'n-folder', name: 'moved.pdf' }
    respondWith(moved)

    const result = await nodes.move('n-1', { parent_id: 'n-folder', name: 'moved.pdf' })

    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe('https://api.roset.dev/v1/nodes/n-1')
    expect(init.method).toBe('PATCH')
    const body = JSON.parse(init.body)
    expect(body.parent_id).toBe('n-folder')
    expect(body.name).toBe('moved.pdf')
    expect(result.parent_id).toBe('n-folder')
  })

  // -------------------------------------------------------------------------
  // rename
  // -------------------------------------------------------------------------

  it('rename sends PATCH /v1/nodes/{id} with only name', async () => {
    const renamed = { ...sampleNode, name: 'renamed.pdf' }
    respondWith(renamed)

    const result = await nodes.rename('n-1', 'renamed.pdf')

    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe('https://api.roset.dev/v1/nodes/n-1')
    expect(init.method).toBe('PATCH')
    const body = JSON.parse(init.body)
    expect(body.name).toBe('renamed.pdf')
    expect(body.parent_id).toBeUndefined()
    expect(result.name).toBe('renamed.pdf')
  })

  // -------------------------------------------------------------------------
  // listChildren
  // -------------------------------------------------------------------------

  it('listChildren sends GET /v1/nodes with parent_id query param', async () => {
    respondWith({ nodes: [sampleNode], next_cursor: null })

    await nodes.listChildren('n-folder', { page: 2, pageSize: 10, status: 'active' })

    const [url] = mockFetch.mock.calls[0]
    const parsed = new URL(url)
    expect(parsed.searchParams.get('parent_id')).toBe('n-folder')
    expect(parsed.searchParams.get('page')).toBe('2')
    expect(parsed.searchParams.get('limit')).toBe('10')
    expect(parsed.searchParams.get('status')).toBe('active')
  })

  // -------------------------------------------------------------------------
  // search
  // -------------------------------------------------------------------------

  it('search sends GET /v1/nodes/search with query and params', async () => {
    respondWith({ nodes: [sampleNode], next_cursor: null })

    await nodes.search('report', { connection_id: 'conn-1', type: 'file', limit: 5 })

    const [url] = mockFetch.mock.calls[0]
    const parsed = new URL(url)
    expect(parsed.pathname).toBe('/v1/nodes/search')
    expect(parsed.searchParams.get('q')).toBe('report')
    expect(parsed.searchParams.get('connection_id')).toBe('conn-1')
    expect(parsed.searchParams.get('type')).toBe('file')
    expect(parsed.searchParams.get('limit')).toBe('5')
  })

  it('search sends only q when no extra params', async () => {
    respondWith({ nodes: [], next_cursor: null })

    await nodes.search('invoice')

    const [url] = mockFetch.mock.calls[0]
    const parsed = new URL(url)
    expect(parsed.searchParams.get('q')).toBe('invoice')
    expect(parsed.searchParams.has('connection_id')).toBe(false)
  })
})
