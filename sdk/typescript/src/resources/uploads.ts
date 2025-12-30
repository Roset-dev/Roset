import type { HttpClient } from "../http.js";
import { RosetError } from "../errors.js";
import type {
  RosetClientConfig,
  RequestOptions,
  UploadInitResult,
  UploadResult,
  DownloadResult,
  UploadOptions,
} from "../types.js";

export class UploadsResource {
  private readonly fetchFn: typeof globalThis.fetch;

  constructor(
    private readonly http: HttpClient,
    config: RosetClientConfig
  ) {
    this.fetchFn = config.fetch ?? globalThis.fetch;
  }

  /**
   * Initialize an upload - get a signed URL for direct upload
   *
   * @example
   * ```typescript
   * const { uploadUrl, uploadToken } = await client.uploads.init({
   *   name: 'report.pdf',
   *   contentType: 'application/pdf',
   *   size: 1024000,
   *   parentId: 'folder-123'
   * });
   * ```
   */
  async init(
    options: UploadOptions,
    requestOptions?: RequestOptions
  ): Promise<UploadInitResult> {
    return this.http.post<UploadInitResult>(
      "/v1/uploads/init",
      {
        nodeId: options.nodeId,
        parentId: options.parentId,
        parentPath: options.parentPath,
        name: options.name,
        contentType: options.contentType,
        size: options.size,
        metadata: options.metadata,
        multipart: options.multipart,
        expectedSha256: options.expectedSha256,
      },
      {
        idempotencyKey: requestOptions?.idempotencyKey,
        ...requestOptions,
      }
    );
  }

  /**
   * Commit an upload after bytes have been uploaded to storage
   */
  async commit(
    uploadToken: string,
    options?: {
      etag?: string;
      size?: number;
    } & RequestOptions
  ): Promise<UploadResult> {
    return this.http.post<UploadResult>(
      "/v1/uploads/commit",
      {
        uploadToken,
        etag: options?.etag,
        size: options?.size,
      },
      {
        idempotencyKey: options?.idempotencyKey,
        ...options,
      }
    );
  }

  /**
   * Get URL for a multipart upload part
   */
  async getPartUrl(
    uploadToken: string,
    partNumber: number,
    options?: RequestOptions
  ): Promise<{ uploadUrl: string }> {
    return this.http.post<{ uploadUrl: string }>(
      `/v1/uploads/${uploadToken}/part?partNumber=${partNumber}`,
      {},
      options
    );
  }

  /**
   * Complete a multipart upload
   */
  async completeMultipart(
    uploadToken: string,
    parts: { ETag: string; PartNumber: number }[],
    options?: RequestOptions
  ): Promise<UploadResult> {
    return this.http.post<UploadResult>(
      `/v1/uploads/${uploadToken}/complete`,
      { parts },
      {
        idempotencyKey: options?.idempotencyKey,
        ...options,
      }
    );
  }

  /**
   * Abort a pending upload
   */
  async abort(uploadToken: string, options?: RequestOptions): Promise<void> {
    await this.http.delete(`/v1/uploads/${uploadToken}`, options);
  }

  /**
   * Get a signed download URL for a file by ID
   */
  async getDownloadUrl(nodeId: string, options?: RequestOptions): Promise<DownloadResult> {
    return this.http.get<DownloadResult>(`/v1/nodes/${nodeId}/download`, options);
  }

  /**
   * Get a signed download URL for a file by path
   */
  async getDownloadUrlByPath(
    path: string,
    options?: RequestOptions
  ): Promise<DownloadResult> {
    return this.http.get<DownloadResult>(
      `/v1/download?path=${encodeURIComponent(path)}`,
      options
    );
  }

  /**
   * Convenience method: Upload a file in one call
   *
   * This handles init → upload → commit automatically for small files.
   * For large files, use multipart uploads.
   *
   * @example
   * ```typescript
   * const buffer = await fs.readFile('report.pdf');
   * const { node } = await client.uploads.upload('report.pdf', buffer, {
   *   contentType: 'application/pdf',
   *   parentId: 'folder-123'
   * });
   * ```
   */
  async upload(
    name: string,
    data: ArrayBuffer | Uint8Array,
    options?: UploadOptions & RequestOptions
  ): Promise<UploadResult> {
    const size = data.byteLength;
    const contentType = options?.contentType ?? "application/octet-stream";

    // Step 1: Init upload
    const { uploadUrl, uploadToken } = await this.init(
      { ...options, name, contentType, size },
      options
    );

    const headers: Record<string, string> = {
      "Content-Type": contentType,
    };

    // Only set Content-Length in Node.js (browsers forbid this header)
    if (typeof globalThis.window === "undefined") {
      headers["Content-Length"] = String(size);
    }

    // Step 2: Upload to storage
    const uploadResponse = await this.fetchFn(uploadUrl, {
      method: "PUT",
      body: data as BodyInit,
      headers,
    });

    if (!uploadResponse.ok) {
      // Abort on failure
      await this.abort(uploadToken).catch(() => {});
      throw new RosetError(
        `Upload to storage failed: ${uploadResponse.status} ${uploadResponse.statusText}`,
        "STORAGE_UPLOAD_FAILED",
        uploadResponse.status
      );
    }

    // Get ETag from response
    const etag = uploadResponse.headers.get("etag")?.replace(/"/g, "") ?? "";

    // Step 3: Commit
    return this.commit(uploadToken, { etag, size, ...options });
  }

  /**
   * Convenience method: Download a file by ID
   */
  async download(nodeId: string, options?: RequestOptions): Promise<ArrayBuffer> {
    const { url } = await this.getDownloadUrl(nodeId, options);

    const response = await this.fetchFn(url);
    if (!response.ok) {
      throw new RosetError(
        `Download from storage failed: ${response.status} ${response.statusText}`,
        "STORAGE_DOWNLOAD_FAILED",
        response.status
      );
    }

    return response.arrayBuffer();
  }

  /**
   * Convenience method: Download a file by path
   */
  async downloadByPath(path: string, options?: RequestOptions): Promise<ArrayBuffer> {
    const { url } = await this.getDownloadUrlByPath(path, options);

    const response = await this.fetchFn(url);
    if (!response.ok) {
      throw new RosetError(
        `Download from storage failed: ${response.status} ${response.statusText}`,
        "STORAGE_DOWNLOAD_FAILED",
        response.status
      );
    }

    return response.arrayBuffer();
  }
}
