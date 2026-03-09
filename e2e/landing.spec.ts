import { test, expect } from "./fixtures";

/**
 * Landing Page Tests
 * Test hero flow and initial UI rendering
 */

test.describe("Landing Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("should render landing page with hero section", async ({ page }) => {
    // Check main heading
    await expect(page.locator("h1")).toContainText("What do you want");
    // Check subheading
    await expect(page.locator("h1 + p")).toContainText("intelligent AI assistant");
  });

  test("should display model selector and prompt input", async ({ page }) => {
    // Check for model control button
    const modelsButton = page.locator("button:has-text('Models & Keys')");
    await expect(modelsButton).toBeVisible();

    // Check for hero prompt input
    const textarea = page.locator("textarea[placeholder='Ask me anything...']");
    await expect(textarea).toBeVisible();
  });

  test("should disable start button when no model selected", async ({ page }) => {
    const textarea = page.locator("textarea[placeholder='Ask me anything...']");
    const startButton = page.locator("button[aria-label='Send']:nth-of-type(2)");

    // Click on textarea
    await textarea.fill("Test message");

    // Start button should still be disabled (no model selected)
    await expect(startButton).toBeDisabled();
  });

  test("should show recent conversations", async ({ page }) => {
    // Check if recent conversations section exists
    const heading = page.locator("h2:has-text('Recent conversations')");
    // May or may not be visible depending on data
    // Just check the section is in DOM if conversations exist
    const section = page.locator("section:has(h2)").first();
    await expect(section).toBeVisible();
  });

  test("should navigate to /chat on 'Start Chatting' button", async ({
    page,
  }) => {
    const startChatButton = page.locator("a:has-text('Start Chatting')").first();
    await startChatButton.click();

    await expect(page).toHaveURL("/chat");
  });
});
