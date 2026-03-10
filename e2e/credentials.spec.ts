import { test, expect } from "./fixtures";

/**
 * Settings & Credential Management Tests
 * Validates the /chat/settings page, credential form, and credential list.
 */

test.describe("Settings Page", () => {
  test.beforeEach(async ({ page, hydrate }) => {
    await page.goto("/chat/settings");
    await hydrate();
  });

  test("should render the settings page with heading", async ({ page }) => {
    const heading = page.locator("h1");
    await expect(heading).toContainText("Settings");
  });

  test("should show the Add API Key section", async ({ page }) => {
    const addKeyHeading = page.locator("h2").filter({ hasText: "Add API Key" });
    await expect(addKeyHeading).toBeVisible();
  });

  test("should display credential form with name input", async ({ page }) => {
    const nameInput = page.locator("[data-testid='credential-name']");
    await expect(nameInput).toBeVisible();
    await expect(nameInput).toHaveAttribute("placeholder", /Platform name/);
  });

  test("should display API key input", async ({ page }) => {
    const apiKeyInput = page.locator("[data-testid='credential-apikey']");
    await expect(apiKeyInput).toBeVisible();
    await expect(apiKeyInput).toHaveAttribute("type", "password");
  });

  test("should display platform kind selector", async ({ page }) => {
    const kindSelect = page.locator("[data-testid='credential-kind']");
    await expect(kindSelect).toBeVisible();
  });

  test("should disable save button when fields are empty", async ({ page }) => {
    const saveButton = page.locator("[data-testid='save-credential']");
    await expect(saveButton).toBeDisabled();
  });

  test("should enable save button when name and API key are filled", async ({
    page,
  }) => {
    const nameInput = page.locator("[data-testid='credential-name']");
    const apiKeyInput = page.locator("[data-testid='credential-apikey']");
    const saveButton = page.locator("[data-testid='save-credential']");

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

  test("should show Connected Platforms section", async ({ page }) => {
    const heading = page
      .locator("h2")
      .filter({ hasText: "Connected Platforms" });
    await expect(heading).toBeVisible();
  });

  test("should show empty state when no credentials", async ({
    page,
    cleanup,
  }) => {
    // Ensure we start clean
    void cleanup;
    const emptyMessage = page.locator("text=No platform added yet");
    await expect(emptyMessage).toBeVisible({ timeout: 5000 });
  });

  test("should show Danger Zone section", async ({ page }) => {
    const dangerHeading = page.locator("h2").filter({ hasText: "Danger Zone" });
    await expect(dangerHeading).toBeVisible();
  });

  test("should have back navigation button", async ({ page }) => {
    // The back button is inside the main content, next to the h1
    // On desktop, the first visible button may be a sidebar button.
    // Target the one near the heading:
    const backButton = page.locator("main button").first();
    await expect(backButton).toBeVisible();
  });
});

/**
 * Credential Form Dialog (via SettingsDialog component)
 * Tests the dialog trigger accessible from sidebar Settings link.
 */
test.describe("Credential Management via Settings Page", () => {
  test("should navigate to settings from chat sidebar", async ({
    page,
    hydrate,
  }) => {
    await page.goto("/chat");
    await hydrate();

    const settingsLink = page.locator("a[href='/chat/settings']").first();
    await expect(settingsLink).toBeVisible({ timeout: 5000 });
    await settingsLink.click();

    await expect(page).toHaveURL("/chat/settings");
    await expect(page.locator("h1")).toContainText("Settings");
  });
});
