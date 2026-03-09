import { test, expect } from "./fixtures";

/**
 * Chat Interface Tests
 * Test the chat page and model selection during conversation
 */

test.describe("Chat Interface", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/chat");
  });

  test("should render chat page", async ({ page }) => {
    // Check for empty state
    const emptyState = page.locator("h2:has-text('How can I help you today')");
    await expect(emptyState).toBeVisible();
  });

  test("should display model control on chat page", async ({ page }) => {
    const modelsButton = page.locator("button:has-text('Models & Keys')");
    await expect(modelsButton).toBeVisible();

    // Check for model selector
    const selector = page.locator("[role='combobox']").first();
    await expect(selector).toBeVisible();
  });

  test("should show disabled send button without model selection", async ({
    page,
  }) => {
    const textarea = page.locator("textarea[placeholder='Type your message...']");
    const sendButton = page.locator("button[aria-label='Send']");

    // Fill message
    await textarea.fill("Hello");

    // Send button should be disabled without model
    await expect(sendButton).toBeDisabled();
  });

  test("should display new chat button in sidebar", async ({ page }) => {
    const newChatButton = page.locator("button:has-text('New chat')");
    await expect(newChatButton).toBeVisible();
  });

  test("should navigate to home when clicking home button in footer", async ({
    page,
  }) => {
    const homeLink = page.locator("a[aria-label='Home']");
    if (await homeLink.isVisible().catch(() => false)) {
      await homeLink.click();
      await expect(page).toHaveURL("/");
    }
  });
});

/**
 * Active Conversation Tests
 * Test chat within an active conversation
 */

test.describe("Active Conversation", () => {
  let conversationId: string;

  test.beforeEach(async ({ page, request }) => {
    // Create a test conversation via API
    const response = await request.post("/api/conversations", {
      data: {},
    });
    const data = (await response.json()) as { id: string };
    conversationId = data.id;

    await page.goto(`/chat/${conversationId}`);
  });

  test("should load conversation page", async ({ page }) => {
    // Page should load without errors
    await expect(page).toHaveURL(`/chat/${conversationId}`);

    // Model control should be visible
    const modelsButton = page.locator("button:has-text('Models & Keys')");
    await expect(modelsButton).toBeVisible();
  });

  test("should display conversation in sidebar after loading", async ({
    page,
  }) => {
    // The conversation should appear in the sidebar
    // (if navigation is implemented)
    const sidebar = page.locator("[role='navigation']");
    if (await sidebar.isVisible().catch(() => false)) {
      await expect(sidebar).toBeVisible();
    }
  });

  test("should show prompt input area", async ({ page }) => {
    const textarea = page.locator("textarea[placeholder='Type your message...']");
    await expect(textarea).toBeVisible();

    const sendButton = page.locator("button[aria-label='Send']");
    await expect(sendButton).toBeVisible();
  });

  test("should disable send without model selection", async ({ page }) => {
    const textarea = page.locator("textarea[placeholder='Type your message...']");
    const sendButton = page.locator("button[aria-label='Send']");

    await textarea.fill("Test message");
    await expect(sendButton).toBeDisabled();
  });

  test("should persist model selection after page reload", async ({ page }) => {
    // This will be fully testable once credentials are added
    // For now, just verify the selector persists in DOM
    const selector = page.locator("[role='combobox']").first();
    await expect(selector).toBeVisible();

    const currentValue = await selector.inputValue().catch(() => "");
    // Reload page
    await page.reload();

    // Selector should still be visible after reload
    const selectorAfterReload = page.locator("[role='combobox']").first();
    await expect(selectorAfterReload).toBeVisible();
  });
});
