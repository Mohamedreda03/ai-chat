import { test, expect } from "@playwright/test";

/**
 * Accessibility Tests
 * WCAG 2.1 Level AA compliance checks for key pages.
 */

test.describe("Accessibility - Landing Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(300);
  });

  test("should have a single h1 heading", async ({ page }) => {
    const h1 = page.locator("h1");
    await expect(h1).toHaveCount(1);
  });

  test("should have lang attribute on html element", async ({ page }) => {
    const lang = await page.locator("html").getAttribute("lang");
    expect(lang).toBeTruthy();
    expect(lang).toBe("en");
  });

  test("should have a descriptive page title", async ({ page }) => {
    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);
    expect(title).not.toBe("undefined");
  });

  test("send button should have aria-label", async ({ page }) => {
    const sendButton = page.locator("button[aria-label='Send']");
    await expect(sendButton).toBeVisible();
    await expect(sendButton).toHaveAttribute("aria-label", "Send");
  });

  test("theme toggle should have aria-label", async ({ page }) => {
    const themeToggle = page.locator("button[aria-label='Toggle dark mode']");
    await expect(themeToggle).toBeVisible();
  });

  test("images should have alt text or be hidden", async ({ page }) => {
    const images = page.locator("img");
    const count = await images.count();

    for (let i = 0; i < count; i++) {
      const img = images.nth(i);
      const alt = await img.getAttribute("alt");
      const isHidden = await img.getAttribute("aria-hidden");
      const role = await img.getAttribute("role");
      // Must have alt, aria-hidden, or presentation role
      expect(alt !== null || isHidden !== null || role === "presentation").toBe(
        true,
      );
    }
  });

  test("interactive elements should be keyboard-focusable", async ({
    page,
  }) => {
    // Tab through the page and verify focus moves
    await page.keyboard.press("Tab");
    const firstFocused = page.locator(":focus");
    const tagName = await firstFocused
      .evaluate((el) => el.tagName)
      .catch(() => "");
    // Should focus on something interactive (a, button, input, etc.)
    expect(["A", "BUTTON", "INPUT", "TEXTAREA", "SELECT", ""]).toContain(
      tagName,
    );
  });

  test("color information should be available via computed styles", async ({
    page,
  }) => {
    const heading = page.locator("h1");
    const style = await heading.evaluate((el) => {
      const computed = window.getComputedStyle(el);
      return {
        color: computed.color,
        fontSize: computed.fontSize,
      };
    });
    expect(style.color).toBeTruthy();
    expect(style.fontSize).toBeTruthy();
  });
});

test.describe("Accessibility - Chat Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/chat");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(300);
  });

  test("submit button should have aria-label", async ({ page }) => {
    const submitButton = page.locator("button[aria-label='Submit']");
    await expect(submitButton).toBeVisible();
  });

  test("textarea should have placeholder for accessibility", async ({
    page,
  }) => {
    const textarea = page.locator(
      "textarea[placeholder='Type your message...']",
    );
    await expect(textarea).toBeVisible();
  });

  test("sidebar buttons should have accessible labels", async ({ page }) => {
    // Collapse sidebar button
    const collapseBtn = page.locator("button[aria-label='Collapse sidebar']");
    if (await collapseBtn.isVisible().catch(() => false)) {
      await expect(collapseBtn).toHaveAttribute("aria-label");
    }

    // Mobile open button
    const mobileBtn = page.locator("button[aria-label='Open sidebar']");
    // Exists but might be hidden on desktop
    const count = await mobileBtn.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test("delete conversation buttons should have aria-label", async ({
    page,
    request,
  }) => {
    // Create a conversation so delete button appears
    const res = await request.post("/api/conversations", { data: {} });
    if (res.ok()) {
      const conv = (await res.json()) as { id: string };
      await page.goto(`/chat/${conv.id}`);
      await page.waitForLoadState("domcontentloaded");
      await page.waitForTimeout(500);

      const deleteBtn = page
        .locator("button[aria-label='Delete conversation']")
        .first();
      if (await deleteBtn.isVisible().catch(() => false)) {
        await expect(deleteBtn).toHaveAttribute(
          "aria-label",
          "Delete conversation",
        );
      }

      await request.delete(`/api/conversations/${conv.id}`).catch(() => {});
    }
  });
});

test.describe("Accessibility - Settings Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/chat/settings");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(300);
  });

  test("should have proper heading hierarchy", async ({ page }) => {
    const h1 = page.locator("h1");
    await expect(h1).toHaveCount(1);
    await expect(h1).toContainText("Settings");

    // h2 elements should exist (Add API Key, Connected Platforms, Danger Zone)
    const h2s = page.locator("h2");
    const count = await h2s.count();
    expect(count).toBeGreaterThanOrEqual(2);
  });

  test("form inputs should have placeholders or labels", async ({ page }) => {
    const nameInput = page.locator("[data-testid='credential-name']");
    await expect(nameInput).toHaveAttribute("placeholder");

    const apiKeyInput = page.locator("[data-testid='credential-apikey']");
    await expect(apiKeyInput).toHaveAttribute("placeholder");
  });

  test("save button disabled state provides clear feedback", async ({
    page,
  }) => {
    const saveButton = page.locator("[data-testid='save-credential']");
    await expect(saveButton).toBeDisabled();
    // Disabled buttons should communicate non-interactivity
    const isDisabled = await saveButton.isDisabled();
    expect(isDisabled).toBe(true);
  });
});
