import { describe, it, expect } from 'vitest';
import { RosetClient } from './index.js';

describe('RosetClient', () => {
  it('should be instantiable', () => {
    const client = new RosetClient({ baseUrl: 'http://localhost', apiKey: 'test' });
    expect(client).toBeDefined();
  });
});
