import { describe, it, expect } from 'vitest';
import { RosetClient } from './index.js';
import { RosetAdmin } from './admin-index.js';

describe('Roset SDK', () => {
  const config = { apiKey: 'test' };

  describe('RosetClient (Data Plane)', () => {
    it('should be instantiable', () => {
      const client = new RosetClient(config);
      expect(client).toBeDefined();
    });

    it('should have all data plane resources', () => {
      const client = new RosetClient(config);
      expect(client.nodes).toBeDefined();
      expect(client.uploads).toBeDefined();
      expect(client.shares).toBeDefined();
      expect(client.audit).toBeDefined();
      expect(client.mounts).toBeDefined();
      expect(client.leases).toBeDefined();
      expect(client.commits).toBeDefined();
      expect(client.refs).toBeDefined();
      expect(client.search).toBeDefined();
      expect(client.nodes.deleteMany).toBeDefined();
      expect(client.nodes.moveMany).toBeDefined();
    });

    it('should have core FS convenience methods', () => {
      const client = new RosetClient(config);
      expect(client.nodes.list).toBeDefined();
      expect(client.nodes.stat).toBeDefined();
      expect(client.nodes.exists).toBeDefined();
      expect(client.nodes.mkdirp).toBeDefined();
    });

    it('should support mount and tenant scoping', () => {
      const client = new RosetClient({ ...config, tenantId: 'tenant-1', mountId: 'mount-1' });
      expect(client.tenantId).toBe('tenant-1');
      expect(client.mountId).toBe('mount-1');

      const scopedClient = client.useMount('mount-2');
      expect(scopedClient.mountId).toBe('mount-2');
      expect(scopedClient.tenantId).toBe('tenant-1');

      const tenantClient = client.useTenant('tenant-2');
      expect(tenantClient.tenantId).toBe('tenant-2');
    });

    it('should NOT have admin resources', () => {
      const client = new RosetClient(config);
      expect((client as unknown as Record<string, unknown>).org).toBeUndefined();
      expect((client as unknown as Record<string, unknown>).integrations).toBeUndefined();
    });
  });

  describe('RosetAdmin (Control Plane)', () => {
    it('should be instantiable', () => {
      const admin = new RosetAdmin(config);
      expect(admin).toBeDefined();
    });

    it('should have control plane resources', () => {
      const admin = new RosetAdmin(config);
      expect(admin.org).toBeDefined();
      expect(admin.integrations).toBeDefined();
      expect(admin.billing).toBeDefined();
    });
  });
});
