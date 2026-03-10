import {
  test as base,
  expect,
  type Page,
  type APIRequestContext,
} from "@playwright/test";

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

/** Remove all conversations via API (best-effort, silent). */
async function cleanupConversations(request: APIRequestContext) {
  try {
    await request.delete("/api/conversations");
  } catch {
    /* ignore */
  }
}

/** Remove all credentials via API. */
async function cleanupCredentials(request: APIRequestContext) {
  try {
    const res = await request.get("/api/ai/credentials");
    if (!res.ok()) return;
    const list = (await res.json()) as Array<{ id: string }>;
    for (const c of list) {
      await request.delete(`/api/ai/credentials/${c.id}`).catch(() => {});
    }
  } catch {
    /* ignore */
  }
}

/** Wait until the page is fully hydrated (Next.js client-side). */
async function waitForHydration(page: Page) {
  await page.waitForLoadState("domcontentloaded");
  // Small buffer for React hydration
  await page.waitForTimeout(300);
}

/* ------------------------------------------------------------------ */
/*  Fixtures                                                          */
/* ------------------------------------------------------------------ */

type Fixtures = {
  /** Cleans up all conversations + credentials after the test. */
  cleanup: void;
  /** Helper to wait for hydration. */
  hydrate: () => Promise<void>;
};

export const test = base.extend<Fixtures>({
  cleanup: [
    async ({ request }, use) => {
      await use();
      // After test – clean up
      await cleanupConversations(request);
      await cleanupCredentials(request);
    },
    { auto: false },
  ],

  hydrate: async ({ page }, use) => {
    await use(() => waitForHydration(page));
  },
});

export { expect };
