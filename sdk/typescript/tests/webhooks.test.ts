/**
 * Webhooks Tests (Phase 77.6)
 *
 * Tests for webhook signature verification and WebhooksResource methods.
 */

import { webcrypto } from "node:crypto";
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  verifyWebhookSignature,
  WebhookVerificationError,
  WebhooksResource,
} from "../src/resources/webhooks.js";

// Node 18 doesn't expose crypto.subtle globally — use node:crypto's webcrypto.
const subtle = globalThis.crypto?.subtle ?? (webcrypto as unknown as Crypto).subtle;

// Helper: compute HMAC SHA-256 hex (same as SDK does)
async function computeHmac(body: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await subtle.sign("HMAC", key, encoder.encode(body));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

describe("verifyWebhookSignature", () => {
  const secret = "test-webhook-secret-12345";

  it("verifies a valid signature and returns parsed event", async () => {
    const body = JSON.stringify({
      id: "evt-1",
      type: "file.created",
      created_at: "2026-01-15T00:00:00Z",
      data: { file_id: "f-1", filename: "test.pdf", space: "default", content_type: "application/pdf", size_bytes: 1024 },
    });
    const hmac = await computeHmac(body, secret);
    const signature = `sha256=${hmac}`;

    const event = await verifyWebhookSignature(body, signature, secret);

    expect(event.type).toBe("file.created");
    expect(event.data).toEqual({
      file_id: "f-1",
      filename: "test.pdf",
      space: "default",
      content_type: "application/pdf",
      size_bytes: 1024,
    });
  });

  it("throws WebhookVerificationError for missing signature", async () => {
    const body = JSON.stringify({ id: "evt-1", type: "file.created", data: {} });

    await expect(
      verifyWebhookSignature(body, "", secret),
    ).rejects.toThrow(WebhookVerificationError);
  });

  it("throws WebhookVerificationError for invalid signature format", async () => {
    const body = JSON.stringify({ id: "evt-1", type: "file.created", data: {} });

    await expect(
      verifyWebhookSignature(body, "md5=abcdef", secret),
    ).rejects.toThrow(WebhookVerificationError);
  });

  it("throws WebhookVerificationError for wrong signature", async () => {
    const body = JSON.stringify({ id: "evt-1", type: "file.created", data: {} });
    const wrongHmac = "a".repeat(64); // Wrong HMAC
    const signature = `sha256=${wrongHmac}`;

    await expect(
      verifyWebhookSignature(body, signature, secret),
    ).rejects.toThrow(WebhookVerificationError);
  });

  it("throws WebhookVerificationError for tampered body", async () => {
    const originalBody = JSON.stringify({ id: "evt-1", type: "file.created", data: { file_id: "f-1" } });
    const hmac = await computeHmac(originalBody, secret);
    const signature = `sha256=${hmac}`;

    // Tamper with the body
    const tamperedBody = JSON.stringify({ id: "evt-1", type: "file.created", data: { file_id: "f-2" } });

    await expect(
      verifyWebhookSignature(tamperedBody, signature, secret),
    ).rejects.toThrow(WebhookVerificationError);
  });

  it("throws WebhookVerificationError for wrong secret", async () => {
    const body = JSON.stringify({ id: "evt-1", type: "file.created", data: {} });
    const hmac = await computeHmac(body, secret);
    const signature = `sha256=${hmac}`;

    await expect(
      verifyWebhookSignature(body, signature, "wrong-secret"),
    ).rejects.toThrow(WebhookVerificationError);
  });

  it("parses different event types correctly", async () => {
    const body = JSON.stringify({
      id: "evt-2",
      type: "job.completed",
      created_at: "2026-01-15T00:00:00Z",
      data: { job_id: "j-1", file_id: "f-1", provider: "reducto", status: "completed" },
    });
    const hmac = await computeHmac(body, secret);
    const signature = `sha256=${hmac}`;

    const event = await verifyWebhookSignature(body, signature, secret);

    expect(event.type).toBe("job.completed");
    expect(event.data).toEqual({ job_id: "j-1", file_id: "f-1", provider: "reducto", status: "completed" });
  });
});

describe("WebhooksResource.verify (static)", () => {
  const secret = "static-test-secret";

  it("delegates to verifyWebhookSignature", async () => {
    const body = JSON.stringify({
      id: "evt-1",
      type: "file.deleted",
      created_at: "2026-01-15T00:00:00Z",
      data: { file_id: "f-del" },
    });
    const hmac = await computeHmac(body, secret);
    const signature = `sha256=${hmac}`;

    const event = await WebhooksResource.verify(body, signature, secret);

    expect(event.type).toBe("file.deleted");
    expect(event.data).toEqual({ file_id: "f-del" });
  });
});

describe("WebhooksResource", () => {
  let mockHttp: {
    get: ReturnType<typeof vi.fn>;
    post: ReturnType<typeof vi.fn>;
    patch: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  let resource: WebhooksResource;

  beforeEach(() => {
    mockHttp = {
      get: vi.fn(),
      post: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
    };
    resource = new WebhooksResource(mockHttp as any);
  });

  it("create() calls POST /v1/webhooks", async () => {
    const mockResult = { id: "wh-1", url: "https://example.com/hook", events: "file.created", enabled: true };
    mockHttp.post.mockResolvedValue(mockResult);

    const result = await resource.create({ url: "https://example.com/hook", events: ["file.created"] });

    expect(mockHttp.post).toHaveBeenCalledWith("/v1/webhooks", {
      url: "https://example.com/hook",
      events: ["file.created"],
    });
    expect(result.id).toBe("wh-1");
  });

  it("list() calls GET /v1/webhooks", async () => {
    mockHttp.get.mockResolvedValue({ webhooks: [] });

    const result = await resource.list();

    expect(mockHttp.get).toHaveBeenCalledWith("/v1/webhooks");
    expect(result.webhooks).toEqual([]);
  });

  it("get() calls GET /v1/webhooks/:id", async () => {
    mockHttp.get.mockResolvedValue({ id: "wh-1" });

    const result = await resource.get("wh-1");

    expect(mockHttp.get).toHaveBeenCalledWith("/v1/webhooks/wh-1");
    expect(result.id).toBe("wh-1");
  });

  it("update() calls PATCH /v1/webhooks/:id", async () => {
    mockHttp.patch.mockResolvedValue({ id: "wh-1", enabled: false });

    const result = await resource.update("wh-1", { enabled: false });

    expect(mockHttp.patch).toHaveBeenCalledWith("/v1/webhooks/wh-1", { enabled: false });
    expect(result.enabled).toBe(false);
  });

  it("delete() calls DELETE /v1/webhooks/:id", async () => {
    mockHttp.delete.mockResolvedValue(undefined);

    await resource.delete("wh-1");

    expect(mockHttp.delete).toHaveBeenCalledWith("/v1/webhooks/wh-1");
  });

  it("listDeliveries() calls GET /v1/webhooks/:id/deliveries with query params", async () => {
    mockHttp.get.mockResolvedValue({ deliveries: [], next_cursor: null });

    await resource.listDeliveries("wh-1", { limit: 10, cursor: "abc" });

    expect(mockHttp.get).toHaveBeenCalledWith("/v1/webhooks/wh-1/deliveries", { limit: "10", cursor: "abc" });
  });

  it("test() calls POST /v1/webhooks/:id/test", async () => {
    mockHttp.post.mockResolvedValue({ success: true });

    const result = await resource.test("wh-1");

    expect(mockHttp.post).toHaveBeenCalledWith("/v1/webhooks/wh-1/test");
    expect(result.success).toBe(true);
  });

  it("replay() calls POST /v1/webhooks/:id/replay", async () => {
    mockHttp.post.mockResolvedValue({ replayed: 5 });

    const result = await resource.replay("wh-1", {
      since: "2026-01-01",
      event_types: ["file.created"],
    });

    expect(mockHttp.post).toHaveBeenCalledWith("/v1/webhooks/wh-1/replay", {
      since: "2026-01-01",
      event_types: ["file.created"],
    });
    expect(result.replayed).toBe(5);
  });

  it("replay() without params passes empty object", async () => {
    mockHttp.post.mockResolvedValue({ replayed: 0 });

    await resource.replay("wh-1");

    expect(mockHttp.post).toHaveBeenCalledWith("/v1/webhooks/wh-1/replay", {});
  });
});
