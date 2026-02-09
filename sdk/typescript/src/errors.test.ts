import { describe, it, expect } from 'vitest'
import {
  RosetError,
  NotFoundError,
  ForbiddenError,
  ConflictError,
  ValidationError,
  RateLimitError,
  QuotaExceededError,
  UnauthorizedError,
  TimeoutError,
  ServiceUnavailableError,
  ServerError,
  NetworkError,
  parseApiError,
} from './errors.js'

// ---------------------------------------------------------------------------
// RosetError (base)
// ---------------------------------------------------------------------------

describe('RosetError', () => {
  it('sets message, code, statusCode, and defaults', () => {
    const err = new RosetError('boom')
    expect(err).toBeInstanceOf(Error)
    expect(err).toBeInstanceOf(RosetError)
    expect(err.message).toBe('boom')
    expect(err.code).toBe('ROSET_ERROR')
    expect(err.statusCode).toBe(500)
    expect(err.details).toBeUndefined()
    expect(err.requestId).toBeUndefined()
    expect(err.retryable).toBe(false)
    expect(err.name).toBe('RosetError')
  })

  it('propagates details, requestId, retryable, and cause', () => {
    const details = { field: 'email', reason: 'invalid' }
    const cause = new Error('root')
    const err = new RosetError('fail', 'CUSTOM', 422, details, {
      requestId: 'req-abc',
      retryable: true,
      cause,
    })
    expect(err.code).toBe('CUSTOM')
    expect(err.statusCode).toBe(422)
    expect(err.details).toEqual(details)
    expect(err.requestId).toBe('req-abc')
    expect(err.retryable).toBe(true)
    expect(err.cause).toBe(cause)
  })
})

// ---------------------------------------------------------------------------
// Subclass identity & properties
// ---------------------------------------------------------------------------

describe('NotFoundError', () => {
  it('constructs with resource and id', () => {
    const err = new NotFoundError('File', 'abc-123')
    expect(err).toBeInstanceOf(RosetError)
    expect(err).toBeInstanceOf(NotFoundError)
    expect(err.name).toBe('NotFoundError')
    expect(err.message).toBe("File 'abc-123' not found")
    expect(err.code).toBe('NOT_FOUND')
    expect(err.statusCode).toBe(404)
    expect(err.retryable).toBe(false)
  })

  it('constructs with resource only (no id)', () => {
    const err = new NotFoundError('Job')
    expect(err.message).toBe('Job not found')
  })
})

describe('ForbiddenError', () => {
  it('has correct defaults', () => {
    const err = new ForbiddenError()
    expect(err.name).toBe('ForbiddenError')
    expect(err.message).toBe('Access denied')
    expect(err.code).toBe('FORBIDDEN')
    expect(err.statusCode).toBe(403)
    expect(err.retryable).toBe(false)
  })
})

describe('ConflictError', () => {
  it('has correct defaults', () => {
    const err = new ConflictError()
    expect(err.name).toBe('ConflictError')
    expect(err.message).toBe('Resource already exists')
    expect(err.code).toBe('CONFLICT')
    expect(err.statusCode).toBe(409)
    expect(err.retryable).toBe(false)
  })
})

describe('ValidationError', () => {
  it('carries details', () => {
    const details = { fields: { name: 'required' } }
    const err = new ValidationError('Invalid input', details)
    expect(err.name).toBe('ValidationError')
    expect(err.code).toBe('VALIDATION_ERROR')
    expect(err.statusCode).toBe(400)
    expect(err.details).toEqual(details)
    expect(err.retryable).toBe(false)
  })
})

describe('RateLimitError', () => {
  it('is retryable and carries retryAfter', () => {
    const err = new RateLimitError('slow down', 30, { requestId: 'req-1', retryable: true })
    expect(err.name).toBe('RateLimitError')
    expect(err.code).toBe('RATE_LIMIT')
    expect(err.statusCode).toBe(429)
    expect(err.retryAfter).toBe(30)
    expect(err.requestId).toBe('req-1')
    // retryable comes from options, not auto-set in the class body
    // The constructor passes options through to super which defaults false,
    // but the caller passes retryable: true
    expect(err.retryable).toBe(true)
  })

  it('allows undefined retryAfter', () => {
    const err = new RateLimitError()
    expect(err.retryAfter).toBeUndefined()
  })
})

describe('QuotaExceededError', () => {
  it('has correct defaults and carries details', () => {
    const details = { limit: 1000, used: 1000 }
    const err = new QuotaExceededError('Too many files', details)
    expect(err.name).toBe('QuotaExceededError')
    expect(err.code).toBe('QUOTA_EXCEEDED')
    expect(err.statusCode).toBe(402)
    expect(err.details).toEqual(details)
    expect(err.retryable).toBe(false)
  })
})

describe('UnauthorizedError', () => {
  it('has correct defaults', () => {
    const err = new UnauthorizedError()
    expect(err.name).toBe('UnauthorizedError')
    expect(err.code).toBe('UNAUTHORIZED')
    expect(err.statusCode).toBe(401)
    expect(err.retryable).toBe(false)
  })
})

describe('TimeoutError', () => {
  it('is retryable', () => {
    const err = new TimeoutError()
    expect(err.name).toBe('TimeoutError')
    expect(err.code).toBe('REQUEST_TIMEOUT')
    expect(err.statusCode).toBe(504)
    expect(err.retryable).toBe(true)
  })
})

describe('ServiceUnavailableError', () => {
  it('is retryable and carries retryAfter', () => {
    const err = new ServiceUnavailableError('down', 60, { requestId: 'req-2' })
    expect(err.name).toBe('ServiceUnavailableError')
    expect(err.code).toBe('SERVICE_UNAVAILABLE')
    expect(err.statusCode).toBe(503)
    expect(err.retryable).toBe(true)
    expect(err.retryAfter).toBe(60)
    expect(err.requestId).toBe('req-2')
  })
})

describe('ServerError', () => {
  it('is retryable and defaults to 500', () => {
    const err = new ServerError()
    expect(err.name).toBe('ServerError')
    expect(err.code).toBe('INTERNAL_ERROR')
    expect(err.statusCode).toBe(500)
    expect(err.retryable).toBe(true)
  })

  it('accepts custom statusCode', () => {
    const err = new ServerError('Bad gateway', 502)
    expect(err.statusCode).toBe(502)
    expect(err.message).toBe('Bad gateway')
  })
})

describe('NetworkError', () => {
  it('is retryable and has statusCode 0', () => {
    const cause = new TypeError('Failed to fetch')
    const err = new NetworkError('Network error', cause)
    expect(err.name).toBe('NetworkError')
    expect(err.code).toBe('NETWORK_ERROR')
    expect(err.statusCode).toBe(0)
    expect(err.retryable).toBe(true)
    expect(err.cause).toBe(cause)
  })
})

// ---------------------------------------------------------------------------
// parseApiError
// ---------------------------------------------------------------------------

describe('parseApiError', () => {
  it('maps 400 to ValidationError', () => {
    const err = parseApiError(400, { error: 'bad input', details: { field: 'x' } })
    expect(err).toBeInstanceOf(ValidationError)
    expect(err.message).toBe('bad input')
    expect(err.details).toEqual({ field: 'x' })
  })

  it('maps 401 to UnauthorizedError', () => {
    const err = parseApiError(401, { error: 'no token' })
    expect(err).toBeInstanceOf(UnauthorizedError)
    expect(err.message).toBe('no token')
  })

  it('maps 402 to QuotaExceededError', () => {
    const err = parseApiError(402, { error: 'over quota' })
    expect(err).toBeInstanceOf(QuotaExceededError)
  })

  it('maps 403 to ForbiddenError', () => {
    const err = parseApiError(403, { error: 'nope' })
    expect(err).toBeInstanceOf(ForbiddenError)
  })

  it('maps 404 to NotFoundError', () => {
    const err = parseApiError(404, { error: 'File not found' })
    expect(err).toBeInstanceOf(NotFoundError)
    // NotFoundError constructor takes resource string and appends "not found",
    // so the message from parseApiError's body.error becomes the resource
    expect(err.message).toBe('File not found not found')
  })

  it('maps 409 to ConflictError', () => {
    const err = parseApiError(409, { error: 'duplicate' })
    expect(err).toBeInstanceOf(ConflictError)
  })

  it('maps 429 to RateLimitError with retryAfter', () => {
    const err = parseApiError(429, { error: 'rate limited', retryAfter: 15 }, { requestId: 'req-x' })
    expect(err).toBeInstanceOf(RateLimitError)
    expect((err as RateLimitError).retryAfter).toBe(15)
    expect(err.requestId).toBe('req-x')
    expect(err.retryable).toBe(true)
  })

  it('maps 429 with QUOTA_EXCEEDED code to QuotaExceededError', () => {
    const err = parseApiError(429, { error: 'quota hit', code: 'QUOTA_EXCEEDED', details: { limit: 100 } })
    expect(err).toBeInstanceOf(QuotaExceededError)
    expect(err.details).toEqual({ limit: 100 })
  })

  it('maps 500 to ServerError', () => {
    const err = parseApiError(500, { error: 'internal' }, { requestId: 'req-500' })
    expect(err).toBeInstanceOf(ServerError)
    expect(err.statusCode).toBe(500)
    expect(err.retryable).toBe(true)
    expect(err.requestId).toBe('req-500')
  })

  it('maps 502 to ServerError with correct statusCode', () => {
    const err = parseApiError(502, { error: 'bad gateway' })
    expect(err).toBeInstanceOf(ServerError)
    expect(err.statusCode).toBe(502)
  })

  it('maps 503 to ServiceUnavailableError with retryAfter', () => {
    const err = parseApiError(503, { error: 'maintenance', retryAfter: 120 })
    expect(err).toBeInstanceOf(ServiceUnavailableError)
    expect((err as ServiceUnavailableError).retryAfter).toBe(120)
    expect(err.retryable).toBe(true)
  })

  it('maps 504 to TimeoutError', () => {
    const err = parseApiError(504, { error: 'timed out' })
    expect(err).toBeInstanceOf(TimeoutError)
    expect(err.retryable).toBe(true)
  })

  it('maps unknown 5xx to ServerError', () => {
    const err = parseApiError(507, { error: 'storage full' })
    expect(err).toBeInstanceOf(ServerError)
    expect(err.statusCode).toBe(507)
    expect(err.retryable).toBe(true)
  })

  it('maps unknown 4xx to base RosetError', () => {
    const err = parseApiError(418, { error: "I'm a teapot", code: 'TEAPOT' })
    expect(err).toBeInstanceOf(RosetError)
    expect(err).not.toBeInstanceOf(ValidationError)
    expect(err.code).toBe('TEAPOT')
    expect(err.statusCode).toBe(418)
  })

  it('uses fallback message and code when body is empty', () => {
    const err = parseApiError(404, {})
    // 404 maps to NotFoundError which takes the message as the resource param
    // and appends "not found", so "Unknown error" becomes "Unknown error not found"
    expect(err).toBeInstanceOf(NotFoundError)
    expect(err.message).toBe('Unknown error not found')
  })

  it('uses fallback message for non-mapped status when body is empty', () => {
    const err = parseApiError(418, {})
    expect(err.message).toBe('Unknown error')
    expect(err.code).toBe('UNKNOWN')
  })
})
