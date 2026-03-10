import { test, expect } from "./fixtures";

/**
 * Landing Page – File Attachment Tests
 *
 * Validates the PromptInput file-upload functionality added to the hero
 * section of the landing page (`/`).
 */

// A valid minimal 1×1 PNG (white pixel) for image-attachment tests.
const MINIMAL_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);

test.describe("Landing Page – File Attachments", () => {
  test.beforeEach(async ({ page, hydrate }) => {
    await page.goto("/");
    await hydrate();
  });

  // ── Structure ────────────────────────────────────────────────────────────

  test("should have a hidden file input with correct aria-label", async ({
    page,
  }) => {
    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toBeAttached();
    await expect(fileInput).toHaveAttribute("aria-label", "Upload files");
    // The input must be in the DOM but visually hidden (class="hidden")
    await expect(fileInput).toHaveClass(/hidden/);
  });

  test("action menu trigger should be visible in the prompt-input footer", async ({
    page,
  }) => {
    // Radix adds data-slot="dropdown-menu-trigger" to DropdownMenuTrigger children;
    // this uniquely identifies the PromptInputActionMenuTrigger (+icon button).
    const menuTrigger = page.locator(
      'button[aria-haspopup="menu"][data-slot="dropdown-menu-trigger"]',
    );
    await expect(menuTrigger).toBeVisible();
  });

  test("action menu should list 'Add photos or files' when opened", async ({
    page,
  }) => {
    const menuTrigger = page.locator(
      'button[aria-haspopup="menu"][data-slot="dropdown-menu-trigger"]',
    );
    await menuTrigger.click();
    await expect(page.getByText("Add photos or files")).toBeVisible({
      timeout: 3000,
    });
  });

  // ── Attaching files ──────────────────────────────────────────────────────

  test("should show an attachment chip when a text file is added", async ({
    page,
  }) => {
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: "test.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("Hello world"),
    });

    // The inline chip includes a remove button – its presence means the
    // attachment was registered in the UI.
    const removeButton = page.locator('button[aria-label="Remove"]');
    await expect(removeButton).toBeAttached({ timeout: 5000 });
  });

  test("should show an image preview when an image file is attached", async ({
    page,
  }) => {
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: "photo.png",
      mimeType: "image/png",
      buffer: MINIMAL_PNG,
    });

    // The image variant renders an <img> whose alt is the filename.
    const img = page.locator('img[alt="photo.png"]');
    await expect(img).toBeVisible({ timeout: 5000 });
  });

  test("should allow attaching multiple files at once", async ({ page }) => {
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles([
      {
        name: "file1.txt",
        mimeType: "text/plain",
        buffer: Buffer.from("File 1 content"),
      },
      {
        name: "file2.txt",
        mimeType: "text/plain",
        buffer: Buffer.from("File 2 content"),
      },
    ]);

    // Two chips → two remove buttons
    const removeButtons = page.locator('button[aria-label="Remove"]');
    await expect(removeButtons).toHaveCount(2, { timeout: 5000 });
  });

  // ── Removing files ───────────────────────────────────────────────────────

  test("should remove an attachment when its remove button is clicked", async ({
    page,
  }) => {
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: "test.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("Hello world"),
    });

    const removeButton = page.locator('button[aria-label="Remove"]').first();
    await expect(removeButton).toBeAttached({ timeout: 5000 });

    // Use force because the button is opacity-0 until hover
    await removeButton.click({ force: true });

    await expect(removeButton).not.toBeAttached({ timeout: 3000 });
  });

  test("should only remove the clicked attachment when multiple files are added", async ({
    page,
  }) => {
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles([
      {
        name: "keep.txt",
        mimeType: "text/plain",
        buffer: Buffer.from("Keep me"),
      },
      {
        name: "remove.txt",
        mimeType: "text/plain",
        buffer: Buffer.from("Remove me"),
      },
    ]);

    const removeButtons = page.locator('button[aria-label="Remove"]');
    await expect(removeButtons).toHaveCount(2, { timeout: 5000 });

    // Remove the second attachment
    await removeButtons.nth(1).click({ force: true });

    await expect(removeButtons).toHaveCount(1, { timeout: 3000 });
  });

  // ── Submission with file ─────────────────────────────────────────────────

  test("should navigate to conversation page when submitting with a file", async ({
    page,
  }) => {
    const MOCK_CONV_ID = "mock-conv-upload-123";

    // Mock the models API so ModelControl keeps the persisted model selection
    await page.route("**/api/ai/models", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          credentials: [
            {
              credential: {
                id: "test-cred",
                name: "Test Credential",
                kind: "OPENAI_COMPATIBLE",
                baseUrl: null,
                keyHint: "****",
              },
              models: [{ id: "test-model", label: "Test Model" }],
              error: null,
            },
          ],
        }),
      });
    });

    // Intercept upload so no real file is stored server-side
    await page.route("**/api/upload", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          url: "/uploads/test.txt",
          filename: "test.txt",
          mediaType: "text/plain",
        }),
      });
    });

    // Intercept conversation creation
    await page.route("**/api/conversations", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ id: MOCK_CONV_ID }),
        });
      } else {
        await route.continue();
      }
    });

    // Provide a fake model (credentialName required by ModelSelectionValueSchema)
    await page.evaluate(() => {
      localStorage.setItem(
        "selected-model",
        JSON.stringify({
          credentialId: "test-cred",
          modelId: "test-model",
          modelLabel: "Test Model",
          credentialName: "Test Credential",
        }),
      );
    });
    await page.reload();
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(500);

    // Attach a file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: "test.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("Upload test content"),
    });

    // Send button must be enabled before we click it
    const sendButton = page.locator("button[aria-label='Send']");
    await expect(sendButton).toBeEnabled({ timeout: 5000 });
    await sendButton.click();

    // Should navigate to the new conversation
    await expect(page).toHaveURL(`/chat/${MOCK_CONV_ID}`, { timeout: 10000 });
  });

  test("should store pending files in sessionStorage before navigating", async ({
    page,
  }) => {
    const MOCK_CONV_ID = "mock-conv-session-456";

    // Mock the models API so ModelControl keeps the persisted model selection
    await page.route("**/api/ai/models", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          credentials: [
            {
              credential: {
                id: "test-cred",
                name: "Test Credential",
                kind: "OPENAI_COMPATIBLE",
                baseUrl: null,
                keyHint: "****",
              },
              models: [{ id: "test-model", label: "Test Model" }],
              error: null,
            },
          ],
        }),
      });
    });

    await page.route("**/api/upload", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          url: "/uploads/doc.txt",
          filename: "doc.txt",
          mediaType: "text/plain",
        }),
      });
    });

    await page.route("**/api/conversations", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ id: MOCK_CONV_ID }),
        });
      } else {
        await route.continue();
      }
    });

    await page.evaluate(() => {
      localStorage.setItem(
        "selected-model",
        JSON.stringify({
          credentialId: "test-cred",
          modelId: "test-model",
          modelLabel: "Test Model",
          credentialName: "Test Credential",
        }),
      );
    });
    await page.reload();
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(500);

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: "doc.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("Document content"),
    });

    const sendButton = page.locator("button[aria-label='Send']");
    await expect(sendButton).toBeEnabled({ timeout: 5000 });
    await sendButton.click();

    // Wait for navigation first
    await expect(page).toHaveURL(`/chat/${MOCK_CONV_ID}`, { timeout: 10000 });

    // Verify pending files were written to sessionStorage under the correct key
    const stored = await page.evaluate(
      (id) => sessionStorage.getItem(`pending-files-${id}`),
      MOCK_CONV_ID,
    );
    expect(stored).not.toBeNull();

    const files = JSON.parse(stored!) as Array<{ filename: string }>;
    expect(files.length).toBeGreaterThan(0);
    expect(files[0].filename).toBe("doc.txt");
  });
});
