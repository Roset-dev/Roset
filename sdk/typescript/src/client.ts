/**
 * RosetClient - Main SDK entry point
 */

import { HttpClient, generateIdempotencyKey } from "./http.js";
import { NodesResource } from "./resources/nodes.js";
import { UploadsResource } from "./resources/uploads.js";
import { SharesResource } from "./resources/shares.js";
import { AuditResource } from "./resources/audit.js";
import { MountsResource } from "./resources/mounts.js";
import { LeasesResource } from "./resources/leases.js";
import type { RosetClientConfig } from "./types.js";

export class RosetClient {
  private readonly http: HttpClient;
  private readonly config: RosetClientConfig;

  /** Nodes resource - path resolution, CRUD, move/rename */
  public readonly nodes: NodesResource;

  /** Uploads resource - file upload and download */
  public readonly uploads: UploadsResource;

  /** Shares resource - share link management */
  public readonly shares: SharesResource;

  /** Audit resource - operation log queries */
  public readonly audit: AuditResource;

  /** Mounts resource - storage backend management */
  public readonly mounts: MountsResource;

  /** Leases resource - file-level lease management */
  public readonly leases: LeasesResource;

  constructor(config: RosetClientConfig) {
    if (!config.baseUrl) {
      throw new Error("baseUrl is required");
    }
    if (!config.apiKey) {
      throw new Error("apiKey is required");
    }

    this.config = config;
    this.http = new HttpClient(config);

    // Initialize resources
    this.nodes = new NodesResource(this.http, config);
    this.uploads = new UploadsResource(this.http, config);
    this.shares = new SharesResource(this.http, config);
    this.audit = new AuditResource(this.http, config);
    this.mounts = new MountsResource(this.http, config);
    this.leases = new LeasesResource(this.http, config);
  }

  /**
   * Generate a unique idempotency key for mutations
   */
  static generateIdempotencyKey(): string {
    return generateIdempotencyKey();
  }

  /**
   * Get the configured tenant ID
   */
  get tenantId(): string | undefined {
    return this.config.tenantId;
  }

  /**
   * Get the configured mount ID
   */
  get mountId(): string | undefined {
    return this.config.mountId;
  }

  /**
   * Create a new client scoped to a specific mount
   * 
   * @example
   * ```ts
   * const s3Client = client.useMount('mount-id-here');
   * await s3Client.nodes.list('/');
   * ```
   */
  useMount(mountId: string): RosetClient {
    return new RosetClient({
      ...this.config,
      mountId,
    });
  }

  /**
   * Create a new client scoped to a specific tenant
   * Useful for multi-tenant management scenarios
   */
  useTenant(tenantId: string): RosetClient {
    return new RosetClient({
      ...this.config,
      tenantId,
    });
  }
}

