import { describe, it, expect } from 'vitest';
import { RosetClient } from './index.js';
import { RosetAdmin } from './admin-index.js';

describe('Roset SDK', () => {
  const config = { baseUrl: 'http://localhost', apiKey: 'test' };

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
    });
  });
});
