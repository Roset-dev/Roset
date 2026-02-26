"""Roset Python SDK -- Client.

This module contains the :class:`Client` entry point and all resource classes
that map to the Roset V1 API surface. The client is the primary interface for
uploading files, tracking processing jobs, managing spaces, and querying
analytics.

Typical usage::

    from roset import Client

    client = Client(api_key="rsk_...")
    result = client.upload("report.pdf", space="default")

Resource classes are not instantiated directly; access them via the
corresponding property on :class:`Client` (e.g. ``client.files``,
``client.jobs``).
"""

from __future__ import annotations

import mimetypes
from pathlib import Path
from typing import Any

from roset.http_client import HttpClient


class FilesResource:
    """Operations on file records managed by Roset.

    Files represent documents uploaded for processing. Each file tracks its
    original metadata (filename, MIME type, size) and is associated with one
    or more processing jobs. Once processing completes, extracted outputs are
    available as **variants** (markdown, embeddings, metadata, etc.).

    This resource maps to the ``/v1/files`` API endpoints. For most use cases,
    prefer :meth:`Client.upload` which handles multipart upload and job
    creation in a single call.

    Endpoints:
        POST   /v1/files                        - Create file record
        GET    /v1/files                         - List files
        GET    /v1/files/:id                     - Get file (includes variants)
        DELETE /v1/files/:id                     - Delete file
        GET    /v1/files/:id/variants            - List variants
        GET    /v1/files/:id/variants/:type      - Get specific variant
    """

    def __init__(self, http: HttpClient) -> None:
        self._http = http

    def create(
        self,
        space: str,
        filename: str,
        content_type: str,
        size_bytes: int,
    ) -> dict[str, Any]:
        """Create a file record without uploading bytes.

        This is a low-level method that registers file metadata with Roset.
        Most callers should use :meth:`Client.upload` instead,
        which handles both the record creation and the multipart upload.

        Args:
            space: Namespace for multi-space isolation. Use ``"default"``
                for single-space applications.
            filename: Original filename (e.g. ``"report.pdf"``).
            content_type: MIME type of the file (e.g. ``"application/pdf"``).
            size_bytes: File size in bytes.

        Returns:
            A dict containing the created file record with ``id``, ``status``,
            ``space``, and other metadata fields.

        Raises:
            RosetValidationError: If required fields are missing or invalid.
            RosetUnauthorizedError: If the API key is invalid or missing.
        """
        return self._http.request(
            "POST",
            "/v1/files",
            json={
                "space": space,
                "filename": filename,
                "content_type": content_type,
                "size_bytes": size_bytes,
            },
        )

    def list(
        self,
        space: str | None = None,
        status: str | None = None,
        limit: int | None = None,
        cursor: str | None = None,
    ) -> dict[str, Any]:
        """List files with optional filters and cursor-based pagination.

        Args:
            space: Optional namespace filter for multi-space apps. When
                ``None``, returns files across all spaces in the organization.
            status: Filter by processing status. Valid values include
                ``"uploading"``, ``"queued"``, ``"processing"``,
                ``"completed"``, and ``"failed"``.
            limit: Maximum number of results to return per page.
            cursor: Opaque pagination cursor returned from a previous
                ``list()`` call. Pass this to fetch the next page.

        Returns:
            A dict with ``"files"`` (list of file records) and pagination
            metadata (e.g. ``"cursor"`` for the next page, if any).

        Raises:
            RosetUnauthorizedError: If the API key is invalid or missing.
        """
        return self._http.request(
            "GET",
            "/v1/files",
            params={
                "space": space,
                "status": status,
                "limit": limit,
                "cursor": cursor,
            },
        )

    def get(self, file_id: str) -> dict[str, Any]:
        """Retrieve a single file record by ID, including its variants.

        Args:
            file_id: Unique file identifier (UUID).

        Returns:
            A dict containing the file record and a ``"variants"`` list with
            all extracted outputs (markdown, embeddings, metadata, etc.).

        Raises:
            RosetNotFoundError: If no file exists with the given ID.
            RosetUnauthorizedError: If the API key is invalid or missing.
        """
        return self._http.request("GET", f"/v1/files/{file_id}")

    def delete(self, file_id: str) -> dict[str, Any]:
        """Delete a file and its associated variants.

        This permanently removes the file record and all variant data.
        The operation is irreversible.

        Args:
            file_id: Unique file identifier (UUID).

        Returns:
            An empty dict on success.

        Raises:
            RosetNotFoundError: If no file exists with the given ID.
            RosetUnauthorizedError: If the API key is invalid or missing.
        """
        return self._http.request("DELETE", f"/v1/files/{file_id}")

    def list_variants(self, file_id: str) -> dict[str, Any]:
        """List all variants produced by processing a file.

        Variants are the extracted outputs from the processing pipeline:
        markdown text, vector embeddings, structured metadata, and other
        derivative formats.

        Args:
            file_id: Unique file identifier (UUID).

        Returns:
            A dict with a ``"variants"`` list. Each variant includes its
            ``type``, ``status``, and content or download URL.

        Raises:
            RosetNotFoundError: If no file exists with the given ID.
        """
        return self._http.request("GET", f"/v1/files/{file_id}/variants")

    def get_variant(self, file_id: str, variant_type: str) -> dict[str, Any]:
        """Retrieve a specific variant by type for a given file.

        Args:
            file_id: Unique file identifier (UUID).
            variant_type: The variant type to retrieve. Common types include
                ``"markdown"``, ``"embeddings"``, and ``"metadata"``.

        Returns:
            A dict containing the variant record with its ``type``,
            ``status``, and content or download URL.

        Raises:
            RosetNotFoundError: If the file or variant type does not exist.
        """
        return self._http.request(
            "GET", f"/v1/files/{file_id}/variants/{variant_type}"
        )


class JobsResource:
    """Operations on processing jobs in the Roset pipeline.

    Every file upload creates a processing job that progresses through a state
    machine: ``uploading -> queued -> processing -> completed`` (or ``failed``).
    Jobs track which extraction provider is handling the work, progress
    percentage, error details on failure, and timing information.

    Use this resource to monitor progress, cancel in-flight jobs, or retry
    jobs that have failed.

    Endpoints:
        GET  /v1/jobs              - List jobs
        GET  /v1/jobs/:id          - Get job
        POST /v1/jobs/:id/cancel   - Cancel job
        POST /v1/jobs/:id/retry    - Retry failed job
    """

    def __init__(self, http: HttpClient) -> None:
        self._http = http

    def list(
        self,
        space: str | None = None,
        status: str | None = None,
        limit: int | None = None,
        cursor: str | None = None,
    ) -> dict[str, Any]:
        """List processing jobs with optional filters and pagination.

        Args:
            space: Optional namespace filter for multi-space apps. When
                ``None``, returns jobs across all spaces in the organization.
            status: Filter by job status. Valid values: ``"uploading"``,
                ``"queued"``, ``"processing"``, ``"completed"``, ``"failed"``,
                ``"cancelled"``.
            limit: Maximum number of results to return per page.
            cursor: Opaque pagination cursor from a previous ``list()`` call.

        Returns:
            A dict with ``"jobs"`` (list of job records) and pagination
            metadata.

        Raises:
            RosetUnauthorizedError: If the API key is invalid or missing.
        """
        return self._http.request(
            "GET",
            "/v1/jobs",
            params={
                "space": space,
                "status": status,
                "limit": limit,
                "cursor": cursor,
            },
        )

    def get(self, job_id: str) -> dict[str, Any]:
        """Retrieve a single processing job by ID.

        The returned record includes the job's current status, the associated
        file ID, the extraction provider used, progress percentage, timing,
        and error details (if the job failed).

        Args:
            job_id: Unique job identifier (UUID).

        Returns:
            A dict containing the full job record.

        Raises:
            RosetNotFoundError: If no job exists with the given ID.
            RosetUnauthorizedError: If the API key is invalid or missing.
        """
        return self._http.request("GET", f"/v1/jobs/{job_id}")

    def cancel(self, job_id: str) -> dict[str, Any]:
        """Cancel a job that is currently uploading, queued, or processing.

        Cancellation is best-effort -- if the extraction provider has already
        completed its work, the job may transition to ``completed`` instead.

        Args:
            job_id: Unique job identifier (UUID).

        Returns:
            The updated job record dict reflecting the new status.

        Raises:
            RosetNotFoundError: If no job exists with the given ID.
            RosetConflictError: If the job is already in a terminal state.
        """
        return self._http.request("POST", f"/v1/jobs/{job_id}/cancel")

    def retry(self, job_id: str) -> dict[str, Any]:
        """Retry a job that has failed.

        Creates a new processing attempt for the same file, resetting the job
        status back to ``queued``. Only jobs in the ``failed`` state can be
        retried.

        Args:
            job_id: Unique job identifier (UUID).

        Returns:
            The updated job record dict with the reset status.

        Raises:
            RosetNotFoundError: If no job exists with the given ID.
            RosetConflictError: If the job is not in a ``failed`` state.
        """
        return self._http.request("POST", f"/v1/jobs/{job_id}/retry")


class SpacesResource:
    """Operations on space namespaces.

    Spaces provide optional multi-space isolation for B2B SaaS applications.
    Each space is a logical namespace that scopes files, jobs, and variants.
    If your application serves a single user or team, you can ignore spaces
    entirely -- all resources default to the ``"default"`` space.

    For B2B SaaS builders, spaces let you isolate each of your customers'
    data without managing separate Roset organizations.

    Endpoints:
        GET /v1/spaces              - List spaces
        GET /v1/spaces/:name/stats  - Get space stats
    """

    def __init__(self, http: HttpClient) -> None:
        self._http = http

    def list(self) -> dict[str, Any]:
        """List all spaces in the current organization.

        Returns all space namespaces, including the ``"default"`` space
        that is automatically created for every organization.

        Returns:
            A dict with a ``"spaces"`` list. Each entry includes the space
            ``name`` and summary counts.

        Raises:
            RosetUnauthorizedError: If the API key is invalid or missing.
        """
        return self._http.request("GET", "/v1/spaces")

    def get_stats(self, name: str) -> dict[str, Any]:
        """Retrieve usage statistics for a specific space.

        Args:
            name: Space name (e.g. ``"default"`` or a custom namespace like
                ``"acme-corp"``).

        Returns:
            A dict containing file counts, job counts by status, storage
            usage, and other aggregate statistics for the space.

        Raises:
            RosetNotFoundError: If no space exists with the given name.
            RosetUnauthorizedError: If the API key is invalid or missing.
        """
        return self._http.request("GET", f"/v1/spaces/{name}/stats")


class ConnectionsResource:
    """Operations on storage connections (connectors).

    Connections link an external storage provider (S3, GCS, Azure Blob Storage,
    Cloudflare R2, MinIO, Supabase Storage, Backblaze B2, DigitalOcean Spaces,
    or Wasabi) to Roset. Once connected, Roset can enumerate
    buckets, issue signed URLs for direct uploads, and sync file metadata.

    Endpoints:
        POST   /v1/connections                  - Create connection
        GET    /v1/connections                   - List connections
        GET    /v1/connections/:id               - Get connection
        DELETE /v1/connections/:id               - Delete connection
        POST   /v1/connections/:id/test          - Test connection
        POST   /v1/connections/:id/sync          - Trigger file sync
    """

    def __init__(self, http: HttpClient) -> None:
        self._http = http

    def create(self, **kwargs: Any) -> dict[str, Any]:
        """Create a new storage connection.

        Args:
            **kwargs: Connection configuration fields including ``provider``
                (``"s3"``, ``"gcs"``, ``"azure_blob"``, ``"r2"``, ``"minio"``,
                ``"supabase_storage"``, ``"b2"``, ``"do_spaces"``, or
                ``"wasabi"``), ``name``, ``bucket``, and provider-specific
                credentials.

        Returns:
            A dict containing the created connection record.

        Raises:
            RosetValidationError: If required fields are missing.
        """
        return self._http.request("POST", "/v1/connections", json=kwargs)

    def list(self) -> dict[str, Any]:
        """List all storage connections for the current organization.

        Returns:
            A dict with a ``"connections"`` list.

        Raises:
            RosetUnauthorizedError: If the API key is invalid or missing.
        """
        return self._http.request("GET", "/v1/connections")

    def get(self, connection_id: str) -> dict[str, Any]:
        """Retrieve a single storage connection by ID.

        Args:
            connection_id: Unique connection identifier (UUID).

        Returns:
            A dict containing the connection record with provider details.

        Raises:
            RosetNotFoundError: If no connection exists with the given ID.
        """
        return self._http.request("GET", f"/v1/connections/{connection_id}")

    def delete(self, connection_id: str) -> dict[str, Any]:
        """Delete a storage connection.

        Removing a connection does not delete files that were previously
        synced from it.

        Args:
            connection_id: Unique connection identifier (UUID).

        Returns:
            An empty dict on success.

        Raises:
            RosetNotFoundError: If no connection exists with the given ID.
        """
        return self._http.request("DELETE", f"/v1/connections/{connection_id}")

    def test(self, connection_id: str) -> dict[str, Any]:
        """Test connectivity and permissions for a storage connection.

        Verifies that Roset can reach the configured bucket and has the
        required read/write permissions.

        Args:
            connection_id: Unique connection identifier (UUID).

        Returns:
            A dict with the test result (``"success"`` flag and any errors).

        Raises:
            RosetNotFoundError: If no connection exists with the given ID.
        """
        return self._http.request("POST", f"/v1/connections/{connection_id}/test")

    def sync(self, connection_id: str) -> dict[str, Any]:
        """Trigger a file metadata sync for a storage connection.

        Enumerates the connected bucket and imports any new or updated files
        into Roset.

        Args:
            connection_id: Unique connection identifier (UUID).

        Returns:
            A dict with sync job details.

        Raises:
            RosetNotFoundError: If no connection exists with the given ID.
        """
        return self._http.request("POST", f"/v1/connections/{connection_id}/sync")


class NodesResource:
    """Operations on file and folder nodes in connected storage.

    Nodes represent the hierarchical file/folder structure within a storage
    connection. Each node is either a file (with associated processing data)
    or a folder that contains other nodes.

    Endpoints:
        GET    /v1/nodes                - List nodes
        GET    /v1/nodes/:id            - Get node
        DELETE /v1/nodes/:id            - Delete node
        GET    /v1/nodes/:id/download   - Get download URL
    """

    def __init__(self, http: HttpClient) -> None:
        self._http = http

    def list(self, **kwargs: Any) -> dict[str, Any]:
        """List nodes with optional filters.

        Args:
            **kwargs: Query parameters such as ``parent_id``, ``type``
                (``"file"`` or ``"folder"``), ``space``, ``limit``, and
                ``cursor``.

        Returns:
            A dict with a ``"nodes"`` list and pagination metadata.

        Raises:
            RosetUnauthorizedError: If the API key is invalid or missing.
        """
        return self._http.request("GET", "/v1/nodes", params=kwargs)

    def get(self, node_id: str) -> dict[str, Any]:
        """Retrieve a single node by ID.

        Args:
            node_id: Unique node identifier (UUID).

        Returns:
            A dict containing the node record with its type, path, and
            metadata.

        Raises:
            RosetNotFoundError: If no node exists with the given ID.
        """
        return self._http.request("GET", f"/v1/nodes/{node_id}")

    def delete(self, node_id: str) -> dict[str, Any]:
        """Delete a node. Deleting a folder recursively removes its children.

        Args:
            node_id: Unique node identifier (UUID).

        Returns:
            An empty dict on success.

        Raises:
            RosetNotFoundError: If no node exists with the given ID.
        """
        return self._http.request("DELETE", f"/v1/nodes/{node_id}")

    def download(self, node_id: str) -> dict[str, Any]:
        """Get a signed download URL for a file node.

        Roset never proxies file bytes. This method returns a time-limited
        signed URL that the caller uses to download directly from the
        underlying storage provider.

        Args:
            node_id: Unique node identifier (UUID). Must be a file node.

        Returns:
            A dict containing a ``"url"`` field with the signed download URL.

        Raises:
            RosetNotFoundError: If no node exists with the given ID.
        """
        return self._http.request("GET", f"/v1/nodes/{node_id}/download")


class AnalyticsResource:
    """Aggregate analytics queries for the organization.

    Provides read-only access to processing metrics, file-type breakdowns,
    space-level statistics, failure analysis, and volume trends. These
    endpoints are useful for building dashboards and monitoring processing
    health.

    Endpoints:
        GET /v1/analytics/overview     - High-level summary
        GET /v1/analytics/processing   - Processing metrics over time
        GET /v1/analytics/file-types   - File type distribution
        GET /v1/analytics/spaces       - Per-space statistics
        GET /v1/analytics/failures     - Recent failure details
        GET /v1/analytics/volume       - Upload volume over time
    """

    def __init__(self, http: HttpClient) -> None:
        self._http = http

    def overview(self) -> dict[str, Any]:
        """Retrieve a high-level overview of the organization's usage.

        Returns:
            A dict with aggregate counts (total files, active jobs,
            storage used, etc.).

        Raises:
            RosetUnauthorizedError: If the API key is invalid or missing.
        """
        return self._http.request("GET", "/v1/analytics/overview")

    def processing(self, days: int = 30) -> dict[str, Any]:
        """Retrieve processing metrics over a rolling time window.

        Args:
            days: Number of days to look back. Defaults to 30.

        Returns:
            A dict with time-series processing data (jobs started,
            completed, failed per day).
        """
        return self._http.request("GET", "/v1/analytics/processing", params={"days": days})

    def file_types(self) -> dict[str, Any]:
        """Retrieve a breakdown of files by MIME type.

        Returns:
            A dict mapping content types to counts and percentages.
        """
        return self._http.request("GET", "/v1/analytics/file-types")

    def spaces(self) -> dict[str, Any]:
        """Retrieve per-space usage statistics.

        Returns:
            A dict with a list of spaces and their file/job counts.
        """
        return self._http.request("GET", "/v1/analytics/spaces")

    def failures(self, limit: int = 20) -> dict[str, Any]:
        """Retrieve recent processing failures for debugging.

        Args:
            limit: Maximum number of failure records to return. Defaults
                to 20.

        Returns:
            A dict with a ``"failures"`` list containing job IDs, error
            messages, and timestamps.
        """
        return self._http.request("GET", "/v1/analytics/failures", params={"limit": limit})

    def volume(self, days: int = 30) -> dict[str, Any]:
        """Retrieve upload volume trends over a rolling time window.

        Args:
            days: Number of days to look back. Defaults to 30.

        Returns:
            A dict with time-series upload volume data (files uploaded
            and bytes ingested per day).
        """
        return self._http.request("GET", "/v1/analytics/volume", params={"days": days})


class WebhooksResource:
    """Operations on webhook subscriptions.

    Webhooks deliver real-time HTTP POST notifications to your server when
    processing lifecycle events occur. Supported events include
    ``job.started``, ``job.completed``, ``job.failed``, and
    ``variant.ready``.

    Endpoints:
        POST   /v1/webhooks                      - Create webhook
        GET    /v1/webhooks                       - List webhooks
        GET    /v1/webhooks/:id                   - Get webhook
        PATCH  /v1/webhooks/:id                   - Update webhook
        DELETE /v1/webhooks/:id                   - Delete webhook
        GET    /v1/webhooks/:id/deliveries        - List delivery attempts
        POST   /v1/webhooks/:id/test              - Send test event
    """

    def __init__(self, http: HttpClient) -> None:
        self._http = http

    def create(self, url: str, events: list[str]) -> dict[str, Any]:
        """Register a new webhook subscription.

        Args:
            url: The HTTPS endpoint that will receive POST requests when
                subscribed events fire.
            events: List of event types to subscribe to, e.g.
                ``["job.completed", "job.failed", "variant.ready"]``.

        Returns:
            A dict containing the created webhook record with its ``id``
            and ``secret`` for signature verification.

        Raises:
            RosetValidationError: If the URL or events list is invalid.
        """
        return self._http.request("POST", "/v1/webhooks", json={"url": url, "events": events})

    def list(self) -> dict[str, Any]:
        """List all webhook subscriptions for the organization.

        Returns:
            A dict with a ``"webhooks"`` list.

        Raises:
            RosetUnauthorizedError: If the API key is invalid or missing.
        """
        return self._http.request("GET", "/v1/webhooks")

    def get(self, webhook_id: str) -> dict[str, Any]:
        """Retrieve a single webhook subscription by ID.

        Args:
            webhook_id: Unique webhook identifier (UUID).

        Returns:
            A dict containing the webhook record with URL, events,
            and status.

        Raises:
            RosetNotFoundError: If no webhook exists with the given ID.
        """
        return self._http.request("GET", f"/v1/webhooks/{webhook_id}")

    def update(self, webhook_id: str, **kwargs: Any) -> dict[str, Any]:
        """Update a webhook subscription.

        Args:
            webhook_id: Unique webhook identifier (UUID).
            **kwargs: Fields to update. Supported fields include ``url``,
                ``events``, and ``enabled``.

        Returns:
            The updated webhook record dict.

        Raises:
            RosetNotFoundError: If no webhook exists with the given ID.
            RosetValidationError: If the update payload is invalid.
        """
        return self._http.request("PATCH", f"/v1/webhooks/{webhook_id}", json=kwargs)

    def delete(self, webhook_id: str) -> dict[str, Any]:
        """Delete a webhook subscription.

        Args:
            webhook_id: Unique webhook identifier (UUID).

        Returns:
            An empty dict on success.

        Raises:
            RosetNotFoundError: If no webhook exists with the given ID.
        """
        return self._http.request("DELETE", f"/v1/webhooks/{webhook_id}")

    def deliveries(self, webhook_id: str, limit: int = 50) -> dict[str, Any]:
        """List recent delivery attempts for a webhook.

        Useful for debugging failed deliveries and verifying that your
        endpoint is receiving events correctly.

        Args:
            webhook_id: Unique webhook identifier (UUID).
            limit: Maximum number of delivery records to return. Defaults
                to 50.

        Returns:
            A dict with a ``"deliveries"`` list including HTTP status codes,
            response times, and timestamps for each attempt.

        Raises:
            RosetNotFoundError: If no webhook exists with the given ID.
        """
        return self._http.request("GET", f"/v1/webhooks/{webhook_id}/deliveries", params={"limit": limit})

    def test(self, webhook_id: str) -> dict[str, Any]:
        """Send a test event to the webhook endpoint.

        Dispatches a synthetic event to verify that your server can receive
        and acknowledge webhook deliveries.

        Args:
            webhook_id: Unique webhook identifier (UUID).

        Returns:
            A dict with the delivery result (status code, response time).

        Raises:
            RosetNotFoundError: If no webhook exists with the given ID.
        """
        return self._http.request("POST", f"/v1/webhooks/{webhook_id}/test")


class Client:
    """Roset SDK client for the V1 file-processing-orchestration API.

    This is the main entry point for the Roset Python SDK. It provides access
    to all API resources (files, jobs, spaces, connections, nodes, analytics,
    webhooks) through namespaced properties, plus a convenience
    :meth:`upload` method that handles multipart file upload in a single call.

    The client manages authentication, automatic retries with exponential
    backoff, and structured error handling. All API calls are synchronous.

    Example::

        from roset import Client

        client = Client(api_key="rsk_...")

        # Upload a file -- creates a file record and starts processing.
        result = client.upload("photo.jpg", space="acme")
        file_id = result["file"]["id"]
        job_id = result["job"]["id"]

        # Check processing job status.
        job = client.jobs.get(job_id)

        # List extracted variants once processing completes.
        variants = client.files.list_variants(file_id)

        # Cancel a running job.
        client.jobs.cancel(job_id)

    The client can also be used as a context manager to ensure the underlying
    HTTP connection is properly closed::

        with Client(api_key="rsk_...") as client:
            client.upload("photo.jpg", space="default")
    """

    def __init__(
        self,
        api_key: str,
        base_url: str = "https://api.roset.dev",
        timeout: float = 30.0,
        max_retries: int = 3,
    ):
        """Initialize the Roset client.

        Args:
            api_key: API key for authentication. Must be prefixed with
                ``rsk_`` (e.g. ``"rsk_abc123..."``). Obtain one from the
                Roset Console under Settings > API Keys.
            base_url: Base URL of the Roset API. Defaults to the production
                endpoint. Override for local development or staging.
            timeout: HTTP request timeout in seconds. Defaults to 30.
            max_retries: Maximum number of automatic retry attempts for
                transient failures (rate limits, 5xx errors, network errors).
                Defaults to 3. Set to 0 to disable retries.
        """
        self._http = HttpClient(
            api_key=api_key,
            base_url=base_url,
            timeout=timeout,
            max_retries=max_retries,
        )

        self._files = FilesResource(self._http)
        self._jobs = JobsResource(self._http)
        self._spaces = SpacesResource(self._http)
        self._connections = ConnectionsResource(self._http)
        self._nodes = NodesResource(self._http)
        self._analytics = AnalyticsResource(self._http)
        self._webhooks = WebhooksResource(self._http)

    # ------------------------------------------------------------------
    # Resource accessors
    # ------------------------------------------------------------------

    @property
    def files(self) -> FilesResource:
        """Access file operations (create, list, get, delete, variants)."""
        return self._files

    @property
    def jobs(self) -> JobsResource:
        """Access processing job operations (list, get, cancel, retry)."""
        return self._jobs

    @property
    def spaces(self) -> SpacesResource:
        """Access space namespace operations (list, stats)."""
        return self._spaces

    @property
    def connections(self) -> ConnectionsResource:
        """Access storage connection operations (create, list, test, sync)."""
        return self._connections

    @property
    def nodes(self) -> NodesResource:
        """Access file/folder node operations (list, get, delete, download)."""
        return self._nodes

    @property
    def analytics(self) -> AnalyticsResource:
        """Access analytics queries (overview, processing, volume, failures)."""
        return self._analytics

    @property
    def webhooks(self) -> WebhooksResource:
        """Access webhook operations (create, list, update, delete, test)."""
        return self._webhooks

    # ------------------------------------------------------------------
    # Convenience methods
    # ------------------------------------------------------------------

    def upload(
        self,
        file: str | Path | bytes,
        space: str,
        filename: str | None = None,
        content_type: str | None = None,
    ) -> dict[str, Any]:
        """Upload a file and start processing in a single call.

        This is the primary method most users need. It sends the file bytes
        via multipart form data to the Roset API, which creates a file record,
        kicks off the processing pipeline (routing to the appropriate
        extraction provider based on content type), and returns both the file
        record and the processing job.

        Roset automatically selects the extraction provider:
        - **Reducto** for documents (PDF, DOCX, PPTX, etc.)
        - **Gemini** for images (PNG, JPEG, WebP, etc.)
        - **Whisper** for audio (MP3, WAV, etc.)
        - **OpenAI** for generating vector embeddings

        Args:
            file: The file to upload. Accepts a file path (``str`` or
                ``Path``) or raw ``bytes``.
            space: Namespace for multi-space isolation. Use ``"default"``
                for single-space applications. For B2B SaaS, pass your
                end-customer's identifier.
            filename: Override the filename sent to the API. Automatically
                inferred from the path when ``file`` is a path. **Required**
                when ``file`` is raw ``bytes``.
            content_type: Override the MIME type. Automatically guessed from
                the filename if omitted.

        Returns:
            A dict containing ``"file"`` (the created file record) and
            ``"job"`` (the processing job record with its initial status).

        Raises:
            RosetValidationError: If ``bytes`` are passed without a
                ``filename``, or if ``file`` is an unsupported type.
            FileNotFoundError: If the file path does not exist on disk.
            RosetUnauthorizedError: If the API key is invalid or missing.
        """
        from roset.exceptions import RosetValidationError

        if isinstance(file, (str, Path)):
            path = Path(file)
            if not path.exists():
                raise FileNotFoundError(f"File not found: {path}")
            filename = filename or path.name
            content_type = content_type or mimetypes.guess_type(str(path))[0] or "application/octet-stream"
            file_bytes = path.read_bytes()
        elif isinstance(file, bytes):
            if not filename:
                raise RosetValidationError("filename is required when uploading bytes")
            content_type = content_type or mimetypes.guess_type(filename)[0] or "application/octet-stream"
            file_bytes = file
        else:
            raise RosetValidationError(
                f"file must be a path (str/Path) or bytes, got {type(file).__name__}"
            )

        return self._http.request(
            "POST",
            "/v1/upload",
            files={"file": (filename, file_bytes, content_type)},
            params={"space": space},
        )

    # ------------------------------------------------------------------
    # Lifecycle
    # ------------------------------------------------------------------

    def close(self) -> None:
        """Close the underlying HTTP connection pool.

        Call this method when you are done using the client to release
        network resources. Alternatively, use the client as a context
        manager (``with Client(...) as client:``) for automatic cleanup.
        """
        self._http.close()

    def __enter__(self) -> Client:
        """Enter the context manager. Returns the client instance."""
        return self

    def __exit__(self, *args: Any) -> None:
        """Exit the context manager and close the HTTP connection pool."""
        self.close()
