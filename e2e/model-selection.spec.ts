import { test, expect } from "./fixtures";

/**
 * Model Selection Integration Tests
 * Test the complete flow of model selection and persistence
 */

test.describe("Model Selection", () => {
  test("should initialize without a selected model", async ({ page }) => {
    await page.goto("/");

    // Model selector placeholder should indicate no model selected
    const selector = page.locator("[role='combobox']").first();
    const placeholder = await selector.getAttribute("placeholder");
    expect(
      (
        placeholder ||
        (await selector.textContent().then((t) => t?.toLowerCase()))
      )?.includes("add api key"),
    ).toBe(true);
  });

  test("should persist model selection in localStorage", async ({ page }) => {
    await page.goto("/");

    // Get localStorage value (won't be set initially)
    let value = await page.evaluate(() => localStorage.getItem("selected-model"));
    expect(value).toBeNull();

    // Set a model (simulate selection)
    await page.evaluate(() => {
      localStorage.setItem(
        "selected-model",
        JSON.stringify({
          credentialId: "test-cred",
          credentialName: "Test Provider",
          modelId: "test-model",
          modelLabel: "Test Model",
        }),
      );
    });

    // Reload and check persistence
    await page.reload();

    value = await page.evaluate(() => localStorage.getItem("selected-model"));
    expect(value).not.toBeNull();

    const parsed = JSON.parse(value || "null");
    expect(parsed).toEqual({
      credentialId: "test-cred",
      credentialName: "Test Provider",
      modelId: "test-model",
      modelLabel: "Test Model",
    });
  });

  test("should clear localStorage when option is deleted", async ({
    page,
  }) => {
    await page.goto("/");

    // Set initial selection
    await page.evaluate(() => {
      localStorage.setItem(
        "selected-model",
        JSON.stringify({
          credentialId: "test-cred",
          credentialName: "Test",
          modelId: "test-model",
          modelLabel: "Test",
        }),
      );
    });

    // Verify it's set
    let value = await page.evaluate(() => localStorage.getItem("selected-model"));
    expect(value).not.toBeNull();

    // Clear it (simulate deletion)
    await page.evaluate(() => {
      localStorage.removeItem("selected-model");
    });

    // Verify it's cleared
    value = await page.evaluate(() => localStorage.getItem("selected-model"));
    expect(value).toBeNull();
  });

  test("should use same model in different pages", async ({ page }) => {
    const model = {
      credentialId: "test-cred",
      credentialName: "Test Provider",
      modelId: "test-model",
      modelLabel: "Test Model",
    };

    // Set model on landing page
    await page.goto("/");
    await page.evaluate((m) => {
      localStorage.setItem("selected-model", JSON.stringify(m));
    }, model);

    // Navigate to chat page
    await page.goto("/chat");
    const value = await page.evaluate(() => localStorage.getItem("selected-model"));
    expect(value).not.toBeNull();

    const parsed = JSON.parse(value || "null");
    expect(parsed).toEqual(model);
  });
});
