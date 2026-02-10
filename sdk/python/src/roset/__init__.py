"""Roset Python SDK -- The Transformation Engine for Unstructured Data.

The ``roset`` package provides a Python client for the Roset API. Upload any
document and get back five structured outputs: markdown, embeddings, metadata,
thumbnails, and a searchable index. Roset orchestrates extraction providers
(Reducto for documents, Gemini for images, Whisper for audio, OpenAI for
embeddings) and manages queues, retries, variant tracking, and multi-space
isolation. File bytes go directly to storage via signed URLs.

Quick start::

    from roset import Client

    client = Client(api_key="rsk_...")

    # Upload a file -- kicks off the processing pipeline automatically.
    result = client.upload("report.pdf", space="default")

    # Check processing job status.
    job = client.jobs.get(result["job"]["id"])

    # Retrieve extracted variants (markdown, embeddings, etc.).
    variants = client.files.list_variants(result["file"]["id"])

Key concepts:

* **Files** -- Documents uploaded to Roset. Each upload creates a file record
  and a processing job.
* **Jobs** -- Processing state machine (uploading -> queued -> processing ->
  completed / failed). Track extraction progress and support cancel/retry.
* **Variants** -- Outputs produced by extraction providers: markdown text,
  vector embeddings, thumbnails, and structured metadata.
* **Spaces** -- Optional namespace for B2B SaaS multi-tenancy. Defaults to
  ``"default"``; most single-space applications never need to change this.
* **API Keys** -- Authentication tokens prefixed with ``rsk_``.
* **Provider Keys** -- Optional BYOK (Bring Your Own Key) credentials for
  extraction services. Roset uses managed keys by default. Optionally provide
  your own keys to use your provider accounts instead.

Exception hierarchy:

* :class:`RosetError` -- base for all SDK errors
* :class:`RosetAPIError` -- errors returned by the API (4xx / 5xx)
* :class:`RosetValidationError` -- client-side input validation failures
* :class:`RosetNetworkError` -- transport / connectivity failures

See the ``roset.exceptions`` module for the full hierarchy.
"""

from roset.client import Client
from roset.exceptions import (
    RosetAPIError,
    RosetConflictError,
    RosetError,
    RosetForbiddenError,
    RosetNetworkError,
    RosetNotFoundError,
    RosetQuotaExceededError,
    RosetRateLimitError,
    RosetServerError,
    RosetServiceUnavailableError,
    RosetTimeoutError,
    RosetUnauthorizedError,
    RosetValidationError,
)

__version__ = "0.1.1"

__all__ = [
    # Client
    "Client",
    # Exceptions
    "RosetError",
    "RosetAPIError",
    "RosetValidationError",
    "RosetNotFoundError",
    "RosetConflictError",
    "RosetUnauthorizedError",
    "RosetForbiddenError",
    "RosetRateLimitError",
    "RosetQuotaExceededError",
    "RosetServerError",
    "RosetTimeoutError",
    "RosetServiceUnavailableError",
    "RosetNetworkError",
]
