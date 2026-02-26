import { describe, it, expect, beforeEach, vi } from 'vitest'
import { HttpClient } from '../client.js'
import { FilesResource } from './files.js'
import type { UploadResponse, ListFilesResponse, FileRecord, VariantRecord } from './files.js'

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

describe('FilesResource', () => {
  let http: HttpClient
  let files: FilesResource

  beforeEach(() => {
    vi.clearAllMocks()
    http = new HttpClient({ apiKey: 'rsk_test', baseUrl: 'https://api.roset.dev' })
    files = new FilesResource(http)
  })

  // -------------------------------------------------------------------------
  // upload
  // -------------------------------------------------------------------------

  it('upload sends POST /v1/upload with correct body', async () => {
    const mockResponse: UploadResponse = {
      file_id: 'f-1',
      job_id: 'j-1',
      filename: 'report.pdf',
      space: 'default',
      content_type: 'application/pdf',
      size_bytes: 2048,
      status: 'uploading',
      test_mode: false,
      upload_url: 'https://bucket.s3.amazonaws.com/signed',
    }
    respondWith(mockResponse)

    const result = await files.upload({
      filename: 'report.pdf',
      content_type: 'application/pdf',
      size_bytes: 2048,
    })

    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe('https://api.roset.dev/v1/upload')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body)).toEqual({
      filename: 'report.pdf',
      content_type: 'application/pdf',
      size_bytes: 2048,
      space: 'default',
    })
    expect(result).toEqual(mockResponse)
  })

  it('upload sends optional space and metadata', async () => {
    respondWith({ file_id: 'f-2', job_id: 'j-2' })

    await files.upload({
      filename: 'img.png',
      content_type: 'image/png',
      size_bytes: 512,
      space: 'acme',
      metadata: { source: 'scanner' },
    })

    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.space).toBe('acme')
    expect(body.metadata).toEqual({ source: 'scanner' })
  })

  // -------------------------------------------------------------------------
  // list
  // -------------------------------------------------------------------------

  it('list sends GET /v1/files with no params', async () => {
    const mockResponse: ListFilesResponse = { files: [], next_cursor: null }
    respondWith(mockResponse)

    const result = await files.list()

    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe('https://api.roset.dev/v1/files')
    expect(init.method).toBe('GET')
    expect(result).toEqual(mockResponse)
  })

  it('list sends all query params when provided', async () => {
    respondWith({ files: [], next_cursor: 'cur-2' })

    await files.list({ space: 'acme', status: 'completed', limit: 25, cursor: 'cur-1' })

    const [url] = mockFetch.mock.calls[0]
    const parsed = new URL(url)
    expect(parsed.searchParams.get('space')).toBe('acme')
    expect(parsed.searchParams.get('status')).toBe('completed')
    expect(parsed.searchParams.get('limit')).toBe('25')
    expect(parsed.searchParams.get('cursor')).toBe('cur-1')
  })

  it('list omits unset optional params from query string', async () => {
    respondWith({ files: [], next_cursor: null })

    await files.list({ space: 'prod' })

    const [url] = mockFetch.mock.calls[0]
    const parsed = new URL(url)
    expect(parsed.searchParams.get('space')).toBe('prod')
    expect(parsed.searchParams.has('status')).toBe(false)
    expect(parsed.searchParams.has('limit')).toBe(false)
    expect(parsed.searchParams.has('cursor')).toBe(false)
  })

  // -------------------------------------------------------------------------
  // get
  // -------------------------------------------------------------------------

  it('get sends GET /v1/files/{id}', async () => {
    const mockFile: FileRecord = {
      id: 'f-abc',
      space: 'default',
      filename: 'doc.pdf',
      content_type: 'application/pdf',
      size_bytes: 4096,
      storage_key: 'files/f-abc',
      status: 'completed',
      metadata: '{}',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    }
    respondWith(mockFile)

    const result = await files.get('f-abc')

    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe('https://api.roset.dev/v1/files/f-abc')
    expect(init.method).toBe('GET')
    expect(result).toEqual(mockFile)
  })

  // -------------------------------------------------------------------------
  // delete
  // -------------------------------------------------------------------------

  it('delete sends DELETE /v1/files/{id} and returns void', async () => {
    respondWith(null, 204)

    const result = await files.delete('f-del')

    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe('https://api.roset.dev/v1/files/f-del')
    expect(init.method).toBe('DELETE')
    expect(result).toBeUndefined()
  })

  // -------------------------------------------------------------------------
  // getVariants
  // -------------------------------------------------------------------------

  it('getVariants sends GET /v1/files/{id}/variants', async () => {
    const variants: VariantRecord[] = [
      {
        id: 'v-1',
        file_id: 'f-abc',
        type: 'markdown',
        provider: 'reducto',
        content_type: 'text/markdown',
        size_bytes: 1024,
        created_at: '2026-01-01T00:00:00Z',
      },
      {
        id: 'v-2',
        file_id: 'f-abc',
        type: 'embedding',
        provider: 'openai',
        content_type: null,
        size_bytes: 3072,
        created_at: '2026-01-01T00:00:00Z',
      },
    ]
    respondWith({ variants })

    const result = await files.getVariants('f-abc')

    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe('https://api.roset.dev/v1/files/f-abc/variants')
    expect(init.method).toBe('GET')
    expect(result.variants).toHaveLength(2)
    expect(result.variants[0].type).toBe('markdown')
  })

  it('getVariants returns empty array when no variants exist', async () => {
    respondWith({ variants: [] })

    const result = await files.getVariants('f-empty')
    expect(result.variants).toEqual([])
  })
})
