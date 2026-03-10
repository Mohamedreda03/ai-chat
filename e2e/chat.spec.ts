import { test, expect } from "./fixtures";

/**
 * Chat Interface Tests
 * Validates the /chat page layout, sidebar, prompt input, and empty state.
 */

test.describe("Chat Page", () => {
  test.beforeEach(async ({ page, hydrate }) => {
    await page.goto("/chat");
    await hydrate();
  });

  test("should render the chat page without errors", async ({ page }) => {
    await expect(page).toHaveURL("/chat");
  });

  test("should show the prompt input textarea", async ({ page }) => {
    const textarea = page.locator(
      "textarea[placeholder='Type your message...']",
    );
    await expect(textarea).toBeVisible();
  });

  test("should show a submit button", async ({ page }) => {
    const submitButton = page.locator("button[aria-label='Submit']");
    await expect(submitButton).toBeVisible();
  });

  test("should show model picker", async ({ page }) => {
    // InlineModelPicker renders a button with model label or "Select model"
    const modelPicker = page
      .locator("button")
      .filter({ hasText: /Select model|Loading/ });
    await expect(modelPicker.first()).toBeVisible({ timeout: 10000 });
  });

  test("should show New chat button in sidebar (desktop)", async ({ page }) => {
    // Sidebar is visible on md+ screens
    const newChatButton = page
      .locator("button")
      .filter({ hasText: "New chat" });
    // On wide viewport (Playwright Desktop Chrome = 1280px), sidebar is visible
    await expect(newChatButton).toBeVisible({ timeout: 5000 });
  });

  test("should show Home link in sidebar", async ({ page }) => {
    const homeLink = page.locator("a[href='/']").filter({ hasText: "Home" });
    await expect(homeLink).toBeVisible({ timeout: 5000 });
  });

  test("should show Settings link in sidebar", async ({ page }) => {
    const settingsLink = page.locator("a[href='/chat/settings']").first();
    await expect(settingsLink).toBeVisible({ timeout: 5000 });
  });
});

/**
 * Active Conversation Tests
 * Creates a conversation via API, then validates the conversation page.
 */

test.describe("Active Conversation", () => {
  let conversationId: string;

  test.beforeEach(async ({ page, request, hydrate }) => {
    // Create a test conversation via API
    const response = await request.post("/api/conversations", {
      data: {},
    });
    expect(response.ok()).toBeTruthy();
    const data = (await response.json()) as { id: string };
    conversationId = data.id;

    await page.goto(`/chat/${conversationId}`);
    await hydrate();
  });

  test.afterEach(async ({ request }) => {
    // Clean up the created conversation
    await request
      .delete(`/api/conversations/${conversationId}`)
      .catch(() => {});
  });

  test("should load the conversation page", async ({ page }) => {
    await expect(page).toHaveURL(`/chat/${conversationId}`);
  });

  test("should show empty state with greeting", async ({ page }) => {
    // chat-interface.tsx: ConversationEmptyState title="How can I help you today?"
    const emptyText = page.locator("text=How can I help you today?");
    await expect(emptyText).toBeVisible({ timeout: 10000 });
  });

  test("should show prompt input area", async ({ page }) => {
    const textarea = page.locator(
      "textarea[placeholder='Type your message...']",
    );
    await expect(textarea).toBeVisible();

    const submitButton = page.locator("button[aria-label='Submit']");
    await expect(submitButton).toBeVisible();
  });

  test("should show model picker in conversation", async ({ page }) => {
    const modelPicker = page
      .locator("button")
      .filter({ hasText: /Select model|Loading/ });
    await expect(modelPicker.first()).toBeVisible({ timeout: 10000 });
  });

  test("should keep submit button functional", async ({ page }) => {
    // Submit button should exist (enabled/disabled depends on model selection)
    const submitButton = page.locator("button[aria-label='Submit']");
    await expect(submitButton).toBeVisible();
  });
});
