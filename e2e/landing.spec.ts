import { test, expect } from "./fixtures";

/**
 * Landing Page Tests
 * Validates the hero section, model picker, prompt input, and navigation.
 */

test.describe("Landing Page", () => {
  test.beforeEach(async ({ page, hydrate }) => {
    await page.goto("/");
    await hydrate();
  });

  test("should render hero heading and description", async ({ page }) => {
    const h1 = page.locator("h1");
    await expect(h1).toBeVisible();
    await expect(h1).toContainText("What do you want");

    const description = page.locator("h1 + p");
    await expect(description).toBeVisible();
    await expect(description).toContainText("AI chat assistant");
  });

  test("should display the prompt textarea", async ({ page }) => {
    const textarea = page.locator("textarea[placeholder='Ask me anything...']");
    await expect(textarea).toBeVisible();
  });

  test("should display a send button with aria-label", async ({ page }) => {
    const sendButton = page.locator("button[aria-label='Send']");
    await expect(sendButton).toBeVisible();
  });

  test("should disable send button when no input and no model", async ({
    page,
  }) => {
    const sendButton = page.locator("button[aria-label='Send']");
    await expect(sendButton).toBeDisabled();
  });

  test("should keep send button disabled with input but no model", async ({
    page,
  }) => {
    // Clear any persisted model first
    await page.evaluate(() => localStorage.removeItem("selected-model"));
    await page.reload();
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(300);

    const textarea = page.locator("textarea[placeholder='Ask me anything...']");
    await textarea.fill("Hello world");

    const sendButton = page.locator("button[aria-label='Send']");
    // Without a model, button should be disabled even with text
    await expect(sendButton).toBeDisabled();
  });

  test("should show a model picker button", async ({ page }) => {
    // The InlineModelPicker renders a button with "Select model" or model label
    const modelPicker = page
      .locator("button")
      .filter({ hasText: /Select model|Loading/ });
    // Model picker should exist (might show "Loading..." briefly then "Select model")
    await expect(modelPicker.first()).toBeVisible({ timeout: 10000 });
  });

  test("should navigate to /chat via the Start Chatting link", async ({
    page,
  }) => {
    // On desktop it shows "Start Chatting", on mobile "Chat"
    const chatLink = page.locator("a[href='/chat']").first();
    await expect(chatLink).toBeVisible();
    await chatLink.click();
    await expect(page).toHaveURL("/chat");
  });

  test("should display theme toggle", async ({ page }) => {
    const themeToggle = page.locator("button[aria-label='Toggle dark mode']");
    await expect(themeToggle).toBeVisible();
  });
});
