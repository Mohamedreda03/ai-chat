import { test as base, expect } from "@playwright/test";

/**
 * Utilities for Playwright tests
 */

type Fixtures = {
  // Add custom fixtures here if needed
};

/**
 * Extended test with custom utilities
 */
export const test = base.extend<Fixtures>({});

export { expect };
