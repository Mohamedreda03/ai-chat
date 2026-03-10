import { test, expect } from "./fixtures";

/**
 * API Endpoint Tests
 * Validates all REST API routes: credentials, models, chat, and conversations.
 */

/* ── Credentials ──────────────────────────────────────────────────── */

test.describe("API - Credentials", () => {
  test.afterEach(async ({ request }) => {
    // Clean up any credentials created during the test
    const res = await request.get("/api/ai/credentials");
    if (res.ok()) {
      const list = (await res.json()) as Array<{ id: string }>;
      for (const c of list) {
        await request.delete(`/api/ai/credentials/${c.id}`).catch(() => {});
      }
    }
  });

  test("GET /api/ai/credentials returns an array", async ({ request }) => {
    const response = await request.get("/api/ai/credentials");
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(Array.isArray(data)).toBe(true);
  });

  test("POST /api/ai/credentials returns 400 for empty body", async ({
    request,
  }) => {
    const response = await request.post("/api/ai/credentials", {
      data: {},
    });
    expect(response.status()).toBe(400);
  });

  test("POST /api/ai/credentials returns 400 for invalid kind", async ({
    request,
  }) => {
    const response = await request.post("/api/ai/credentials", {
      data: {
        name: "Test",
        kind: "INVALID_KIND",
        apiKey: "sk-test123",
      },
    });
    expect(response.status()).toBe(400);
  });

  test("POST /api/ai/credentials creates a credential with valid data", async ({
    request,
  }) => {
    const response = await request.post("/api/ai/credentials", {
      data: {
        name: "E2E Test Provider",
        kind: "OPENAI_COMPATIBLE",
        apiKey: "sk-e2e-test-key-123",
      },
    });
    expect(response.ok()).toBeTruthy();

    const data = (await response.json()) as {
      id: string;
      name: string;
      kind: string;
      keyHint: string;
    };
    expect(data.id).toBeTruthy();
    expect(data.name).toBe("E2E Test Provider");
    expect(data.kind).toBe("OPENAI_COMPATIBLE");
    expect(data.keyHint).toBeTruthy();
    // keyHint should be masked
    expect(data.keyHint).not.toBe("sk-e2e-test-key-123");
  });

  test("POST /api/ai/credentials returns 400 for duplicate name", async ({
    request,
  }) => {
    // Create first
    const first = await request.post("/api/ai/credentials", {
      data: {
        name: "Unique E2E Provider",
        kind: "OPENAI_COMPATIBLE",
        apiKey: "sk-first-key-123",
      },
    });
    expect(first.ok()).toBeTruthy();

    // Try duplicate
    const duplicate = await request.post("/api/ai/credentials", {
      data: {
        name: "Unique E2E Provider",
        kind: "ANTHROPIC",
        apiKey: "sk-second-key-456",
      },
    });
    // Should fail with 400 or 409 for unique constraint violation
    expect(duplicate.status()).toBeGreaterThanOrEqual(400);
  });
});

/* ── Models ───────────────────────────────────────────────────────── */

test.describe("API - Models", () => {
  test("GET /api/ai/models returns credentials array", async ({ request }) => {
    const response = await request.get("/api/ai/models");
    expect(response.ok()).toBeTruthy();

    const data = (await response.json()) as {
      credentials: Array<{
        credential: { id: string; name: string; kind: string };
        models: Array<{ id: string; label: string }>;
        error: string | null;
      }>;
    };
    expect(Array.isArray(data.credentials)).toBe(true);
  });
});

/* ── Chat ─────────────────────────────────────────────────────────── */

test.describe("API - Chat", () => {
  test("POST /api/chat returns 400 when credential/model missing", async ({
    request,
  }) => {
    const response = await request.post("/api/chat", {
      data: {
        messages: [
          {
            role: "user",
            content: "Hello",
            parts: [{ type: "text", text: "Hello" }],
          },
        ],
      },
    });
    expect(response.status()).toBe(400);
  });

  test("POST /api/chat returns 400 for empty messages", async ({ request }) => {
    const response = await request.post("/api/chat", {
      data: {
        messages: [],
        credentialId: "test-id",
        modelId: "test-model",
      },
    });
    expect(response.status()).toBe(400);
  });

  test("POST /api/chat returns 404 for non-existent credential", async ({
    request,
  }) => {
    const response = await request.post("/api/chat", {
      data: {
        messages: [
          {
            role: "user",
            content: "Hello",
            parts: [{ type: "text", text: "Hello" }],
          },
        ],
        credentialId: "non-existent-id",
        modelId: "test-model",
      },
    });
    expect(response.status()).toBe(404);
  });

  test("POST /api/chat returns 400 for invalid body", async ({ request }) => {
    const response = await request.post("/api/chat", {
      data: "not-json",
      headers: { "Content-Type": "text/plain" },
    });
    expect(response.status()).toBe(400);
  });
});

/* ── Conversations ────────────────────────────────────────────────── */

test.describe("API - Conversations", () => {
  const createdIds: string[] = [];

  test.afterEach(async ({ request }) => {
    // Clean up all conversations we created
    for (const id of createdIds) {
      await request.delete(`/api/conversations/${id}`).catch(() => {});
    }
    createdIds.length = 0;
  });

  test("GET /api/conversations returns a list", async ({ request }) => {
    const response = await request.get("/api/conversations");
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(Array.isArray(data)).toBe(true);
  });

  test("POST /api/conversations creates a conversation", async ({
    request,
  }) => {
    const response = await request.post("/api/conversations", {
      data: {},
    });
    expect(response.ok()).toBeTruthy();

    const data = (await response.json()) as { id: string; title: string };
    expect(data.id).toBeTruthy();
    createdIds.push(data.id);
  });

  test("POST /api/conversations accepts model selection fields", async ({
    request,
  }) => {
    const response = await request.post("/api/conversations", {
      data: {
        credentialId: "test-cred",
        modelId: "test-model",
        modelLabel: "Test Model",
      },
    });
    expect(response.ok()).toBeTruthy();

    const data = (await response.json()) as { id: string };
    expect(data.id).toBeTruthy();
    createdIds.push(data.id);
  });

  test("GET /api/conversations/[id] returns conversation with messages", async ({
    request,
  }) => {
    // Create
    const createRes = await request.post("/api/conversations", { data: {} });
    expect(createRes.ok()).toBeTruthy();
    const created = (await createRes.json()) as { id: string };
    createdIds.push(created.id);

    // Fetch
    const getRes = await request.get(`/api/conversations/${created.id}`);
    expect(getRes.ok()).toBeTruthy();

    const data = (await getRes.json()) as {
      id: string;
      title: string;
      messages: Array<{ id: string; role: string; content: string }>;
    };
    expect(data.id).toBe(created.id);
    expect(Array.isArray(data.messages)).toBe(true);
  });

  test("GET /api/conversations/[id] returns 404 for non-existent ID", async ({
    request,
  }) => {
    const response = await request.get(
      "/api/conversations/non-existent-id-xyz",
    );
    expect(response.status()).toBe(404);
  });

  test("DELETE /api/conversations/[id] removes a conversation", async ({
    request,
  }) => {
    // Create
    const createRes = await request.post("/api/conversations", { data: {} });
    expect(createRes.ok()).toBeTruthy();
    const created = (await createRes.json()) as { id: string };

    // Delete
    const deleteRes = await request.delete(`/api/conversations/${created.id}`);
    expect(deleteRes.ok()).toBeTruthy();

    // Verify it's gone
    const getRes = await request.get(`/api/conversations/${created.id}`);
    expect(getRes.status()).toBe(404);
  });

  test("PATCH /api/conversations/[id] updates title", async ({ request }) => {
    // Create
    const createRes = await request.post("/api/conversations", { data: {} });
    expect(createRes.ok()).toBeTruthy();
    const created = (await createRes.json()) as { id: string };
    createdIds.push(created.id);

    // Update title
    const patchRes = await request.patch(`/api/conversations/${created.id}`, {
      data: { title: "Updated Title E2E" },
    });
    expect(patchRes.ok()).toBeTruthy();

    // Verify the PATCH response itself has the updated title
    const patchData = (await patchRes.json()) as { id: string; title: string };
    expect(patchData.title).toBe("Updated Title E2E");
  });

  test("DELETE /api/conversations clears all conversations", async ({
    request,
  }) => {
    // Create a conversation for this test
    const res = await request.post("/api/conversations", { data: {} });
    expect(res.ok()).toBeTruthy();
    const conv = (await res.json()) as { id: string };

    // Verify it exists
    const beforeList = await request.get("/api/conversations");
    const before = (await beforeList.json()) as Array<{ id: string }>;
    expect(before.some((c) => c.id === conv.id)).toBe(true);

    // Delete all
    const deleteRes = await request.delete("/api/conversations");
    expect(deleteRes.ok()).toBeTruthy();

    // Verify the one we created is gone
    const afterList = await request.get("/api/conversations");
    const after = (await afterList.json()) as Array<{ id: string }>;
    expect(after.some((c) => c.id === conv.id)).toBe(false);
  });
});
