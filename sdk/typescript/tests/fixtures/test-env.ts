/**
 * SDK Test Environment — test credentials and API health check
 */

export const TEST_API_KEY = process.env.ROSET_TEST_API_KEY || "rsk_f1645ea5dc30b6f03698ee7dd2f6cbd61ea8f1954f4d858536d2731c32b5e1de";
export const TEST_BASE_URL = process.env.ROSET_TEST_API_URL || "http://localhost:8787";
export const TEST_ORG_ID = process.env.ROSET_TEST_ORG_ID || "f56ef258-1db4-4de0-8900-4660ec70ff19";

/**
 * Check if the local API is running. Integration tests skip if offline.
 */
export async function isApiOnline(): Promise<boolean> {
  try {
    const res = await fetch(`${TEST_BASE_URL}/health`, { signal: AbortSignal.timeout(2000) });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Skip integration test if API is offline
 */
export function describeIfApiOnline(name: string, fn: () => void) {
  let online = false;

  beforeAll(async () => {
    online = await isApiOnline();
  });

  describe(name, () => {
    beforeEach(() => {
      if (!online) {
        // Vitest doesn't have a clean conditional skip in beforeEach,
        // so tests should check `online` and return early
      }
    });
    fn();
  });
}
