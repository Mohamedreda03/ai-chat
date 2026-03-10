import { test, expect } from "./fixtures";

/**
 * Sidebar Features Tests
 * Covers: Search Modal, Pin Conversations, Rename Conversations,
 *         and Export as Markdown (⋮ action menu).
 */

// ---------------------------------------------------------------------------
// Search Modal
// ---------------------------------------------------------------------------
test.describe("Search Modal", () => {
  let conversationId: string;
  let conversationTitle: string;

  test.beforeEach(async ({ page, request, hydrate }) => {
    conversationTitle = `Search-Test-${Math.random().toString(36).slice(2, 8)}`;
    const res = await request.post("/api/conversations", {
      data: { title: conversationTitle },
    });
    expect(res.ok()).toBeTruthy();
    conversationId = ((await res.json()) as { id: string }).id;

    await page.goto("/chat");
    await hydrate();
    // Wait for sidebar to finish loading conversations
    await page.waitForSelector(`text=${conversationTitle}`, {
      timeout: 10000,
    });
  });

  test.afterEach(async ({ request }) => {
    await request
      .delete(`/api/conversations/${conversationId}`)
      .catch(() => {});
  });

  test("search button is visible in sidebar", async ({ page }) => {
    const searchBtn = page.locator("button[aria-label='Search conversations']");
    await expect(searchBtn).toBeVisible({ timeout: 5000 });
  });

  test("clicking search button opens dialog with input", async ({ page }) => {
    await page.locator("button[aria-label='Search conversations']").click();
    const searchInput = page.locator(
      "input[placeholder='Search conversations...']",
    );
    await expect(searchInput).toBeVisible({ timeout: 3000 });
  });

  test("search dialog closes on Escape", async ({ page }) => {
    await page.locator("button[aria-label='Search conversations']").click();
    const searchInput = page.locator(
      "input[placeholder='Search conversations...']",
    );
    await expect(searchInput).toBeVisible({ timeout: 3000 });

    await page.keyboard.press("Escape");
    await expect(searchInput).not.toBeVisible({ timeout: 3000 });
  });

  test("search shows existing conversations by default", async ({ page }) => {
    await page.locator("button[aria-label='Search conversations']").click();
    await expect(page.locator(`text=${conversationTitle}`).first()).toBeVisible(
      { timeout: 5000 },
    );
  });

  test("typing filters conversations by title", async ({ page }) => {
    await page.locator("button[aria-label='Search conversations']").click();
    const searchInput = page.locator(
      "input[placeholder='Search conversations...']",
    );
    await searchInput.fill(conversationTitle.slice(0, 10));
    await expect(page.locator(`text=${conversationTitle}`).first()).toBeVisible(
      { timeout: 3000 },
    );
  });

  test("non-matching query shows no results message", async ({ page }) => {
    await page.locator("button[aria-label='Search conversations']").click();
    const searchInput = page.locator(
      "input[placeholder='Search conversations...']",
    );
    await searchInput.fill("zzz-no-match-xyzzy-99999");
    await expect(page.locator("text=No conversations found")).toBeVisible({
      timeout: 3000,
    });
  });

  test("clear button resets the search query", async ({ page }) => {
    await page.locator("button[aria-label='Search conversations']").click();
    const searchInput = page.locator(
      "input[placeholder='Search conversations...']",
    );
    await searchInput.fill("something");

    const clearBtn = page.locator("button[aria-label='Clear search']");
    await expect(clearBtn).toBeVisible({ timeout: 2000 });
    await clearBtn.click();

    await expect(searchInput).toHaveValue("");
  });

  test("clicking a result navigates to that conversation", async ({ page }) => {
    await page.locator("button[aria-label='Search conversations']").click();
    const resultBtn = page
      .locator("button")
      .filter({ hasText: conversationTitle })
      .first();
    await expect(resultBtn).toBeVisible({ timeout: 5000 });
    await resultBtn.click();

    await expect(page).toHaveURL(`/chat/${conversationId}`, {
      timeout: 10000,
    });
  });
});

// ---------------------------------------------------------------------------
// Pin Conversations
// ---------------------------------------------------------------------------
test.describe("Pin Conversations", () => {
  let conversationId: string;
  let conversationTitle: string;

  test.beforeEach(async ({ page, request, hydrate }) => {
    // Unique title prevents parallel workers from pinning the wrong conversation
    conversationTitle = `Pin-${Math.random().toString(36).slice(2, 8)}`;
    const res = await request.post("/api/conversations", {
      data: { title: conversationTitle },
    });
    expect(res.ok()).toBeTruthy();
    conversationId = ((await res.json()) as { id: string }).id;

    await page.goto("/chat");
    await hydrate();
    await page.waitForSelector(`text=${conversationTitle}`, {
      timeout: 10000,
    });
  });

  test.afterEach(async ({ request }) => {
    await request
      .delete(`/api/conversations/${conversationId}`)
      .catch(() => {});
  });

  test("pin button becomes visible when hovering a conversation", async ({
    page,
  }) => {
    const convItem = page
      .locator('[role="button"]')
      .filter({ hasText: conversationTitle })
      .first();
    await convItem.hover();
    const pinBtn = convItem.locator("button[aria-label='Pin']");
    await expect(pinBtn).toBeVisible({ timeout: 2000 });
  });

  test("pinning a conversation shows the Pinned section", async ({ page }) => {
    const convItem = page
      .locator('[role="button"]')
      .filter({ hasText: conversationTitle })
      .first();
    await convItem.hover();
    await convItem.locator("button[aria-label='Pin']").click();

    await expect(page.locator("text=Pinned").first()).toBeVisible({
      timeout: 3000,
    });
  });

  test("pin state is saved to localStorage", async ({ page }) => {
    const convItem = page
      .locator('[role="button"]')
      .filter({ hasText: conversationTitle })
      .first();
    await convItem.hover();
    await convItem.locator("button[aria-label='Pin']").click();

    const stored = await page.evaluate(() =>
      localStorage.getItem("pinned-conversations"),
    );
    expect(stored).not.toBeNull();
    expect(JSON.parse(stored!)).toContain(conversationId);
  });

  test("pin state persists after page reload", async ({ page }) => {
    const convItem = page
      .locator('[role="button"]')
      .filter({ hasText: conversationTitle })
      .first();
    await convItem.hover();
    await convItem.locator("button[aria-label='Pin']").click();
    await expect(page.locator("text=Pinned").first()).toBeVisible({
      timeout: 3000,
    });

    await page.reload();
    await page.waitForTimeout(500);
    await expect(page.locator("text=Pinned").first()).toBeVisible({
      timeout: 10000,
    });
  });

  test("unpinning hides the Pinned section when no others are pinned", async ({
    page,
  }) => {
    // Pin first
    const convItem = page
      .locator('[role="button"]')
      .filter({ hasText: conversationTitle })
      .first();
    await convItem.hover();
    await convItem.locator("button[aria-label='Pin']").click();
    await expect(page.locator("text=Pinned").first()).toBeVisible({
      timeout: 3000,
    });

    // Unpin
    const pinnedItem = page
      .locator('[role="button"]')
      .filter({ hasText: conversationTitle })
      .first();
    await pinnedItem.hover();
    const unpinBtn = pinnedItem.locator("button[aria-label='Unpin']");
    await expect(unpinBtn).toBeVisible({ timeout: 2000 });
    await unpinBtn.click();

    await expect(page.locator("text=Pinned")).not.toBeVisible({
      timeout: 3000,
    });
  });
});

// ---------------------------------------------------------------------------
// Rename Conversations
// ---------------------------------------------------------------------------
test.describe("Rename Conversations", () => {
  let conversationId: string;
  let conversationTitle: string;

  test.beforeEach(async ({ page, request, hydrate }) => {
    conversationTitle = `Rename-${Math.random().toString(36).slice(2, 8)}`;
    const res = await request.post("/api/conversations", {
      data: { title: conversationTitle },
    });
    expect(res.ok()).toBeTruthy();
    conversationId = ((await res.json()) as { id: string }).id;

    await page.goto(`/chat/${conversationId}`);
    await hydrate();
    await page.waitForSelector(`text=${conversationTitle}`, {
      timeout: 10000,
    });
  });

  test.afterEach(async ({ request }) => {
    await request
      .delete(`/api/conversations/${conversationId}`)
      .catch(() => {});
  });

  test("double-clicking shows an inline rename input", async ({ page }) => {
    const convItem = page
      .locator('[role="button"]')
      .filter({ hasText: conversationTitle })
      .first();
    await convItem.dblclick();

    // After dblclick the span is replaced by an input, so the parent's text
    // content changes — use a page-level locator that doesn't depend on it
    const renameInput = page.locator('[role="button"] input').first();
    await expect(renameInput).toBeVisible({ timeout: 3000 });
    await expect(renameInput).toHaveValue(conversationTitle);
  });

  test("pressing Enter saves the new title", async ({ page }) => {
    const convItem = page
      .locator('[role="button"]')
      .filter({ hasText: conversationTitle })
      .first();
    await convItem.dblclick();

    const renameInput = page.locator('[role="button"] input').first();
    await expect(renameInput).toBeVisible({ timeout: 3000 });
    await renameInput.fill("Renamed Successfully");
    await renameInput.press("Enter");

    await expect(renameInput).not.toBeVisible({ timeout: 3000 });
    await expect(
      page
        .locator('[role="button"]')
        .filter({ hasText: "Renamed Successfully" })
        .first(),
    ).toBeVisible({ timeout: 5000 });
  });

  test("pressing Escape cancels the rename", async ({ page }) => {
    const convItem = page
      .locator('[role="button"]')
      .filter({ hasText: conversationTitle })
      .first();
    await convItem.dblclick();

    const renameInput = page.locator('[role="button"] input').first();
    await expect(renameInput).toBeVisible({ timeout: 3000 });
    await renameInput.fill("Cancelled Title");
    await renameInput.press("Escape");

    await expect(renameInput).not.toBeVisible({ timeout: 3000 });
    await expect(
      page
        .locator('[role="button"]')
        .filter({ hasText: conversationTitle })
        .first(),
    ).toBeVisible({ timeout: 3000 });
  });

  test("rename is persisted via the API", async ({ page, request }) => {
    const convItem = page
      .locator('[role="button"]')
      .filter({ hasText: conversationTitle })
      .first();
    await convItem.dblclick();

    const renameInput = page.locator('[role="button"] input').first();
    await expect(renameInput).toBeVisible({ timeout: 3000 });
    await renameInput.fill("API Persisted Title");
    await renameInput.press("Enter");

    await expect(renameInput).not.toBeVisible({ timeout: 3000 });

    // Allow the PATCH request to complete
    await page.waitForTimeout(1500);
    const res = await request.get(`/api/conversations/${conversationId}`);
    const data = (await res.json()) as { title: string };
    expect(data.title).toBe("API Persisted Title");
  });
});

// ---------------------------------------------------------------------------
// Export as Markdown (⋮ action menu)
// ---------------------------------------------------------------------------
test.describe("Export as Markdown", () => {
  let conversationId: string;

  test.beforeEach(async ({ page, request, hydrate }) => {
    const res = await request.post("/api/conversations", { data: {} });
    expect(res.ok()).toBeTruthy();
    conversationId = ((await res.json()) as { id: string }).id;

    await page.goto(`/chat/${conversationId}`);
    await hydrate();
  });

  test.afterEach(async ({ request }) => {
    await request
      .delete(`/api/conversations/${conversationId}`)
      .catch(() => {});
  });

  test("action menu button is visible on the conversation page", async ({
    page,
  }) => {
    const menuBtn = page.locator("button[aria-label='Conversation options']");
    await expect(menuBtn).toBeVisible({ timeout: 5000 });
  });

  test("opening the menu shows the Export as Markdown option", async ({
    page,
  }) => {
    await page.locator("button[aria-label='Conversation options']").click();
    await expect(page.locator("text=Export as Markdown")).toBeVisible({
      timeout: 3000,
    });
  });

  test("Export as Markdown is disabled when there are no messages", async ({
    page,
  }) => {
    await page.locator("button[aria-label='Conversation options']").click();
    const exportItem = page
      .locator('[role="menuitem"]')
      .filter({ hasText: "Export as Markdown" });
    await expect(exportItem).toBeVisible({ timeout: 3000 });
    // Radix UI sets data-disabled="" on disabled menu items
    await expect(exportItem).toHaveAttribute("data-disabled", "");
  });

  test("menu closes after pressing Escape", async ({ page }) => {
    await page.locator("button[aria-label='Conversation options']").click();
    await expect(page.locator("text=Export as Markdown")).toBeVisible({
      timeout: 3000,
    });
    await page.keyboard.press("Escape");
    await expect(page.locator("text=Export as Markdown")).not.toBeVisible({
      timeout: 3000,
    });
  });
});
