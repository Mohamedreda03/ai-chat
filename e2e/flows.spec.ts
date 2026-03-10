import { test, expect } from "./fixtures";

/**
 * User Flow Tests
 * End-to-end user journey tests: navigation, model picker, theme, persistence.
 */

test.describe("Navigation Flows", () => {
  test("can navigate from landing to chat page", async ({ page, hydrate }) => {
    await page.goto("/");
    await hydrate();

    const chatLink = page.locator("a[href='/chat']").first();
    await expect(chatLink).toBeVisible();
    await chatLink.click();

    await expect(page).toHaveURL("/chat");
  });

  test("can navigate from chat to home via sidebar", async ({
    page,
    hydrate,
  }) => {
    await page.goto("/chat");
    await hydrate();

    const homeLink = page.locator("a[href='/']").filter({ hasText: "Home" });
    await expect(homeLink).toBeVisible({ timeout: 5000 });
    await homeLink.click();

    await expect(page).toHaveURL("/");
  });

  test("can navigate from chat to settings via sidebar", async ({
    page,
    hydrate,
  }) => {
    await page.goto("/chat");
    await hydrate();

    const settingsLink = page.locator("a[href='/chat/settings']").first();
    await expect(settingsLink).toBeVisible({ timeout: 5000 });
    await settingsLink.click();

    await expect(page).toHaveURL("/chat/settings");
  });

  test("can create new conversation from chat page", async ({
    page,
    request,
    hydrate,
  }) => {
    // First create a conversation to navigate to, so we're on /chat/[id]
    const res = await request.post("/api/conversations", { data: {} });
    expect(res.ok()).toBeTruthy();
    const conv = (await res.json()) as { id: string };

    await page.goto(`/chat/${conv.id}`);
    await hydrate();

    // Click "New chat" button in sidebar
    const newChatButton = page
      .locator("button")
      .filter({ hasText: "New chat" });
    await expect(newChatButton).toBeVisible({ timeout: 5000 });
    await newChatButton.click();

    // Should navigate to /chat (new chat page)
    await expect(page).toHaveURL("/chat");

    // Clean up
    await request.delete(`/api/conversations/${conv.id}`).catch(() => {});
  });
});

test.describe("Model Picker Accessibility", () => {
  test("model picker is visible on landing page", async ({ page, hydrate }) => {
    await page.goto("/");
    await hydrate();

    const modelPicker = page
      .locator("button")
      .filter({ hasText: /Select model|Loading/ });
    await expect(modelPicker.first()).toBeVisible({ timeout: 10000 });
  });

  test("model picker is visible on chat page", async ({ page, hydrate }) => {
    await page.goto("/chat");
    await hydrate();

    const modelPicker = page
      .locator("button")
      .filter({ hasText: /Select model|Loading/ });
    await expect(modelPicker.first()).toBeVisible({ timeout: 10000 });
  });

  test("model picker opens popover on click", async ({ page, hydrate }) => {
    await page.goto("/chat");
    await hydrate();

    const modelPicker = page
      .locator("button")
      .filter({ hasText: /Select model|Loading/ });
    await expect(modelPicker.first()).toBeVisible({ timeout: 10000 });
    await modelPicker.first().click();

    // Should open a popover with command input for searching models
    const searchInput = page.locator("input[placeholder='Search models...']");
    await expect(searchInput).toBeVisible({ timeout: 5000 });
  });
});

test.describe("Theme Toggle", () => {
  test("theme toggle changes the theme class", async ({ page, hydrate }) => {
    await page.goto("/");
    await hydrate();

    const themeToggle = page.locator("button[aria-label='Toggle dark mode']");
    await expect(themeToggle).toBeVisible();

    // Get initial theme
    const initialClass = await page.locator("html").getAttribute("class");

    // Click theme toggle
    await themeToggle.click();
    await page.waitForTimeout(300);

    // Theme should change
    const newClass = await page.locator("html").getAttribute("class");
    expect(newClass).not.toBe(initialClass);
  });

  test("theme toggle is available on chat page sidebar", async ({
    page,
    hydrate,
  }) => {
    await page.goto("/chat");
    await hydrate();

    const themeToggle = page.locator("button[aria-label='Toggle dark mode']");
    await expect(themeToggle.first()).toBeVisible({ timeout: 5000 });
  });
});

test.describe("localStorage Persistence", () => {
  test("localStorage works for arbitrary data across navigation", async ({
    page,
    hydrate,
  }) => {
    await page.goto("/");
    await hydrate();

    // Set arbitrary data in localStorage
    await page.evaluate(() => {
      localStorage.setItem(
        "e2e-persist-test",
        JSON.stringify({ key: "value123" }),
      );
    });

    // Navigate to a different page
    await page.goto("/chat");
    await hydrate();

    // Verify it persists across navigation
    const value = await page.evaluate(() =>
      localStorage.getItem("e2e-persist-test"),
    );
    expect(value).not.toBeNull();

    const parsed = JSON.parse(value!);
    expect(parsed.key).toBe("value123");

    // Clean up
    await page.evaluate(() => localStorage.removeItem("e2e-persist-test"));
  });

  test("sidebar collapsed state persists", async ({ page, hydrate }) => {
    await page.goto("/chat");
    await hydrate();

    // Check sidebar is visible (expanded by default on desktop)
    const collapseButton = page.locator(
      "button[aria-label='Collapse sidebar']",
    );
    if (await collapseButton.isVisible().catch(() => false)) {
      await collapseButton.click();
      await page.waitForTimeout(300);

      // Verify localStorage
      const collapsed = await page.evaluate(() =>
        localStorage.getItem("sidebar-collapsed"),
      );
      expect(collapsed).toBe("true");

      // Reload
      await page.reload();
      await hydrate();

      // Expand button should now be visible (sidebar is collapsed)
      const expandButton = page.locator("button[aria-label='Expand sidebar']");
      await expect(expandButton).toBeVisible({ timeout: 5000 });
    }
  });
});

test.describe("Conversation Sidebar", () => {
  // Run serially to avoid DELETE ALL interference between tests
  test.describe.configure({ mode: "serial" });

  test("sidebar shows created conversations", async ({
    page,
    request,
    hydrate,
  }) => {
    // Create a conversation
    const createRes = await request.post("/api/conversations", { data: {} });
    expect(createRes.ok()).toBeTruthy();
    const conv = (await createRes.json()) as { id: string; title: string };

    // Set up response listener BEFORE navigation
    const responsePromise = page.waitForResponse(
      (resp) =>
        resp.url().includes("/api/conversations") &&
        resp.request().method() === "GET" &&
        resp.status() === 200,
    );
    await page.goto(`/chat/${conv.id}`);
    await responsePromise;
    await hydrate();

    // The sidebar item container has role="button" with the conversation title
    const sidebarItem = page
      .locator("[role='button']")
      .filter({ hasText: /New Conversation/i })
      .first();
    await expect(sidebarItem).toBeVisible({ timeout: 15000 });

    // Clean up only our specific conversation
    await request.delete(`/api/conversations/${conv.id}`).catch(() => {});
  });

  test("sidebar shows 'No conversations yet' when empty", async ({
    page,
    request,
    hydrate,
  }) => {
    // Clean up all conversations first
    await request.delete("/api/conversations").catch(() => {});

    await page.goto("/chat");
    await hydrate();

    const emptyMsg = page.locator("text=No conversations yet");
    await expect(emptyMsg).toBeVisible({ timeout: 10000 });
  });
});
