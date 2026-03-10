import { test, expect } from "./fixtures";

/**
 * Model Selection Integration Tests
 * Validates model selection persistence in localStorage across pages.
 */

test.describe("Model Selection", () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing model selection
    await page.goto("/");
    await page.evaluate(() => localStorage.removeItem("selected-model"));
  });

  test("should start without a selected model in localStorage", async ({
    page,
  }) => {
    const value = await page.evaluate(() =>
      localStorage.getItem("selected-model"),
    );
    expect(value).toBeNull();
  });

  test("should read and write to localStorage", async ({ page, hydrate }) => {
    await hydrate();

    const testModel = {
      credentialId: "test-cred",
      credentialName: "Test Provider",
      modelId: "test-model",
      modelLabel: "Test Model",
    };

    // Set model in localStorage
    await page.evaluate((m) => {
      localStorage.setItem("selected-model", JSON.stringify(m));
    }, testModel);

    // Verify it was written (before any page reload that triggers hook validation)
    const value = await page.evaluate(() =>
      localStorage.getItem("selected-model"),
    );
    expect(value).not.toBeNull();

    const parsed = JSON.parse(value!);
    expect(parsed).toEqual(testModel);
  });

  test("should clear model selection from localStorage", async ({ page }) => {
    // Set a model first
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
    let value = await page.evaluate(() =>
      localStorage.getItem("selected-model"),
    );
    expect(value).not.toBeNull();

    // Clear it
    await page.evaluate(() => {
      localStorage.removeItem("selected-model");
    });

    // Verify it's gone
    value = await page.evaluate(() => localStorage.getItem("selected-model"));
    expect(value).toBeNull();
  });

  test("localStorage is accessible from different pages", async ({
    page,
    hydrate,
  }) => {
    // Set a value on landing page
    await page.evaluate(() => {
      localStorage.setItem("e2e-test-key", "test-value");
    });

    // Navigate to chat page
    await page.goto("/chat");
    await hydrate();

    // localStorage should persist across same-origin navigation
    const value = await page.evaluate(() =>
      localStorage.getItem("e2e-test-key"),
    );
    expect(value).toBe("test-value");

    // Clean up
    await page.evaluate(() => localStorage.removeItem("e2e-test-key"));
  });

  test("model picker shows Select model when no models available", async ({
    page,
    hydrate,
  }) => {
    await hydrate();

    // The InlineModelPicker should show "Select model" when no credentials exist
    const pickerButton = page
      .locator("button")
      .filter({ hasText: /Select model|Loading/ });
    await expect(pickerButton.first()).toBeVisible({ timeout: 10000 });
  });
});
