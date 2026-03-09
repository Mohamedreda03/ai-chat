import { test, expect } from "./fixtures";

/**
 * API Endpoints Tests
 * Test API routes for credentials and models
 */

test.describe("API - Credentials", () => {
  test("GET /api/ai/credentials - should return empty list initially", async ({
    request,
  }) => {
    const response = await request.get("/api/ai/credentials");
    expect(response.ok()).toBeTruthy();

    const data = (await response.json()) as Array<{
      id: string;
      name: string;
      kind: string;
      keyHint: string;
    }>;
    expect(Array.isArray(data)).toBe(true);
  });

  test("POST /api/ai/credentials - should validate required fields", async ({
    request,
  }) => {
    // Missing required fields
    const response = await request.post("/api/ai/credentials", {
      data: {},
    });

    expect(response.status()).toBe(400);
  });

  test("POST /api/ai/credentials - should validate API key format", async ({
    request,
  }) => {
    const response = await request.post("/api/ai/credentials", {
      data: {
        name: "Test",
        kind: "INVALID_KIND",
        apiKey: "test",
      },
    });

    expect(response.status()).toBe(400);
  });

  test("POST /api/ai/credentials - should require unique name", async ({
    request,
  }) => {
    // Add first credential
    const firstResponse = await request.post("/api/ai/credentials", {
      data: {
        name: "Unique Test",
        kind: "OPENAI_COMPATIBLE",
        apiKey: "sk-test123",
        baseUrl: "https://api.openai.com/v1",
      },
    });

    if (firstResponse.ok()) {
      // Try to add with same name
      const duplicateResponse = await request.post("/api/ai/credentials", {
        data: {
          name: "Unique Test",
          kind: "ANTHROPIC",
          apiKey: "sk-test456",
        },
      });

      expect(duplicateResponse.status()).toBe(400);
    }
  });
});

/**
 * API Models Tests
 */

test.describe("API - Models", () => {
  test("GET /api/ai/models - should return models for available credentials", async ({
    request,
  }) => {
    const response = await request.get("/api/ai/models");
    expect(response.ok()).toBeTruthy();

    const data = (await response.json()) as {
      credentials: Array<{
        credential: { id: string; name: string; kind: string };
        models: Array<{ id: string; name: string }>;
        error?: string;
      }>;
    };

    expect(Array.isArray(data.credentials)).toBe(true);
  });
});

/**
 * Chat API Tests
 */

test.describe("API - Chat", () => {
  test("POST /api/chat - should require credential and model", async ({
    request,
  }) => {
    const response = await request.post("/api/chat", {
      data: {
        messages: [{ role: "user", content: "Hello" }],
      },
    });

    expect(response.status()).toBe(400);
  });

  test("POST /api/chat - should validate messages array", async ({
    request,
  }) => {
    const response = await request.post("/api/chat", {
      data: {
        messages: [],
        credentialId: "test-id",
        modelId: "test-model",
      },
    });

    expect(response.status()).toBe(400);
  });

  test("POST /api/chat - should fail with non-existent credential", async ({
    request,
  }) => {
    const response = await request.post("/api/chat", {
      data: {
        messages: [{ role: "user", content: "Hello" }],
        credentialId: "non-existent-id",
        modelId: "test-model",
      },
    });

    expect(response.status()).toBe(404);
  });
});

/**
 * Conversations API Tests
 */

test.describe("API - Conversations", () => {
  test("GET /api/conversations - should return list of conversations", async ({
    request,
  }) => {
    const response = await request.get("/api/conversations");
    expect(response.ok()).toBeTruthy();

    const data = (await response.json()) as Array<{
      id: string;
      title?: string;
      createdAt: string;
    }>;

    expect(Array.isArray(data)).toBe(true);
  });

  test("POST /api/conversations - should create new conversation", async ({
    request,
  }) => {
    const response = await request.post("/api/conversations", {
      data: {},
    });

    expect(response.ok()).toBeTruthy();

    const data = (await response.json()) as { id: string };
    expect(data.id).toBeTruthy();
  });

  test("POST /api/conversations - should accept model selection", async ({
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
  });

  test("GET /api/conversations/[id] - should return conversation details", async ({
    request,
  }) => {
    // Create a conversation first
    const createResponse = await request.post("/api/conversations", {
      data: {},
    });

    if (createResponse.ok()) {
      const created = (await createResponse.json()) as { id: string };

      // Get the conversation
      const getResponse = await request.get(`/api/conversations/${created.id}`);
      expect(getResponse.ok()).toBeTruthy();

      const data = (await getResponse.json()) as {
        id: string;
        messages: Array<{ id: string; role: string; content: string }>;
      };

      expect(data.id).toBe(created.id);
      expect(Array.isArray(data.messages)).toBe(true);
    }
  });

  test("GET /api/conversations/[id] - should handle non-existent ID", async ({
    request,
  }) => {
    const response = await request.get("/api/conversations/non-existent-id");
    expect(response.status()).toBe(404);
  });
});
