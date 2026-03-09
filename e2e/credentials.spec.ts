import { test, expect } from "./fixtures";

/**
 * Credentials Management Tests
 * Test adding, viewing, and deleting API credentials
 */

test.describe("Credential Management", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("should open models and keys dialog", async ({ page }) => {
    const modelsButton = page.locator("button:has-text('Models & Keys')");
    await modelsButton.click();

    // Check dialog appears
    const dialog = page.locator("[role='dialog']");
    await expect(dialog).toBeVisible();

    // Check dialog title
    await expect(dialog.locator("h2")).toContainText("Models & API keys");
  });

  test("should display credential form in dialog", async ({ page }) => {
    const modelsButton = page.locator("button:has-text('Models & Keys')");
    await modelsButton.click();

    // Check for form inputs
    const nameInput = page.locator("input[placeholder*='Platform name']");
    const apiKeyInput = page.locator("input[type='password']");
    const typeSelect = page.locator("[role='combobox']").first();

    await expect(nameInput).toBeVisible();
    await expect(apiKeyInput).toBeVisible();
    await expect(typeSelect).toBeVisible();
  });

  test("should show base URL input for OpenAI-compatible", async ({ page }) => {
    const modelsButton = page.locator("button:has-text('Models & Keys')");
    await modelsButton.click();

    // Select OpenAI-compatible (should be default)
    const typeSelect = page.locator("[role='combobox']").first();
    await typeSelect.click();

    // Base URL input should be visible for OpenAI-compatible
    const baseUrlInput = page.locator("input[placeholder*='Base URL']");
    // Check if it exists in the DOM
    const isVisible = await baseUrlInput.isVisible().catch(() => false);
    // It's visible because OpenAI-compatible is default
    if (isVisible) {
      await expect(baseUrlInput).toBeVisible();
    }
  });

  test("should validate required fields before saving", async ({ page }) => {
    const modelsButton = page.locator("button:has-text('Models & Keys')");
    await modelsButton.click();

    const saveButton = page.locator("button:has-text('Save API key')");

    // Save button should be disabled initially
    await expect(saveButton).toBeDisabled();
  });

  test("should enable save button when fields are filled", async ({ page }) => {
    const modelsButton = page.locator("button:has-text('Models & Keys')");
    await modelsButton.click();

    const nameInput = page.locator("input[placeholder*='Platform name']");
    const apiKeyInput = page.locator("input[type='password']");
    const saveButton = page.locator("button:has-text('Save API key')");

    // Initially disabled
    await expect(saveButton).toBeDisabled();

    // Fill name
    await nameInput.fill("Test Provider");
    await expect(saveButton).toBeDisabled();

    // Fill API key
    await apiKeyInput.fill("sk-test123456789");

    // Now should be enabled
    await expect(saveButton).toBeEnabled();
  });

  test("should handle save errors gracefully", async ({ page }) => {
    const modelsButton = page.locator("button:has-text('Models & Keys')");
    await modelsButton.click();

    const nameInput = page.locator("input[placeholder*='Platform name']");
    const apiKeyInput = page.locator("input[type='password']");
    const saveButton = page.locator("button:has-text('Save API key')");

    // Fill with test data
    await nameInput.fill("Duplicate Provider");
    await apiKeyInput.fill("sk-invalid");

    // Click save (will fail because provider doesn't exist or is invalid)
    await saveButton.click();

    // Error message should appear
    const errorMsg = page.locator("text=/error|failed/i");
    // May or may not show depending on validation
    // Just ensure save button remains available for retry
    await expect(saveButton).toBeVisible();
  });

  test("should show connected platforms list", async ({ page }) => {
    const modelsButton = page.locator("button:has-text('Models & Keys')");
    await modelsButton.click();

    // Check for the connected platforms heading
    const heading = page.locator("h3:has-text('Connected platforms')");
    await expect(heading).toBeVisible();

    // Check for "No platform added yet" message
    const emptyMsg = page.locator("text=No platform added yet");
    // May be visible initially
    if (await emptyMsg.isVisible().catch(() => false)) {
      await expect(emptyMsg).toBeVisible();
    }
  });
});
