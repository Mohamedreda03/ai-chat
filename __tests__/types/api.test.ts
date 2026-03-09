import { describe, it, expect } from "vitest";
import type { CredentialsWithModelsResponse, ModelSelectionValue } from "@/types/api";

describe("Model Selection Types", () => {
  it("should create a valid ModelSelectionValue", () => {
    const selection: ModelSelectionValue = {
      credentialId: "cred-123",
      modelId: "model-456",
      modelLabel: "GPT-4",
      credentialName: "OpenAI",
    };

    expect(selection.credentialId).toBe("cred-123");
    expect(selection.modelId).toBe("model-456");
    expect(selection.modelLabel).toBe("GPT-4");
    expect(selection.credentialName).toBe("OpenAI");
  });

  it("should create a valid CredentialsWithModelsResponse", () => {
    const response: CredentialsWithModelsResponse = {
      credentials: [
        {
          credential: {
            id: "cred-1",
            name: "My OpenAI",
            kind: "OPENAI_COMPATIBLE",
            baseUrl: "https://api.openai.com/v1",
            keyHint: "sk-...xyz",
          },
          models: [
            { id: "gpt-4", label: "GPT-4" },
            { id: "gpt-3.5", label: "GPT-3.5 Turbo" },
          ],
          error: null,
        },
        {
          credential: {
            id: "cred-2",
            name: "My Anthropic",
            kind: "ANTHROPIC",
            baseUrl: null,
            keyHint: "sk-ant-...abc",
          },
          models: [
            { id: "claude-3", label: "Claude 3" },
          ],
          error: null,
        },
      ],
    };

    expect(response.credentials).toHaveLength(2);
    expect(response.credentials[0].models).toHaveLength(2);
    expect(response.credentials[1].models).toHaveLength(1);
  });

  it("should handle error in credentials response", () => {
    const response: CredentialsWithModelsResponse = {
      credentials: [
        {
          credential: {
            id: "cred-1",
            name: "Failing Provider",
            kind: "GOOGLE",
            baseUrl: null,
            keyHint: "sk-...xyz",
          },
          models: [],
          error: "Failed to fetch models: Invalid API key",
        },
      ],
    };

    expect(response.credentials[0].error).toBeDefined();
    expect(response.credentials[0].models).toHaveLength(0);
  });

  it("should handle empty credentials list", () => {
    const response: CredentialsWithModelsResponse = {
      credentials: [],
    };

    expect(response.credentials).toHaveLength(0);
  });

  it("should allow null baseUrl for non-compatible providers", () => {
    const credential = {
      id: "cred-1",
      name: "Anthropic",
      kind: "ANTHROPIC" as const,
      baseUrl: null,
      keyHint: "sk-...xyz",
    };

    expect(credential.baseUrl).toBeNull();
  });

  it("should allow string baseUrl for compatible providers", () => {
    const credential = {
      id: "cred-1",
      name: "Local LLM",
      kind: "OPENAI_COMPATIBLE" as const,
      baseUrl: "http://localhost:8000/v1",
      keyHint: "local-key",
    };

    expect(credential.baseUrl).toBe("http://localhost:8000/v1");
  });

  it("should group models by credential", () => {
    const response: CredentialsWithModelsResponse = {
      credentials: [
        {
          credential: {
            id: "cred-1",
            name: "Provider A",
            kind: "OPENAI_COMPATIBLE",
            baseUrl: null,
            keyHint: "key1",
          },
          models: [
            { id: "model-a1", label: "Model A1" },
            { id: "model-a2", label: "Model A2" },
          ],
          error: null,
        },
        {
          credential: {
            id: "cred-2",
            name: "Provider B",
            kind: "ANTHROPIC",
            baseUrl: null,
            keyHint: "key2",
          },
          models: [
            { id: "model-b1", label: "Model B1" },
          ],
          error: null,
        },
      ],
    };

    const modelsByProvider = response.credentials.map(item => ({
      provider: item.credential.name,
      modelCount: item.models.length,
    }));

    expect(modelsByProvider).toEqual([
      { provider: "Provider A", modelCount: 2 },
      { provider: "Provider B", modelCount: 1 },
    ]);
  });

  it("should handle mixed error and success credentials", () => {
    const response: CredentialsWithModelsResponse = {
      credentials: [
        {
          credential: {
            id: "cred-1",
            name: "Working Provider",
            kind: "OPENAI_COMPATIBLE",
            baseUrl: null,
            keyHint: "key1",
          },
          models: [{ id: "model-1", label: "Model 1" }],
          error: null,
        },
        {
          credential: {
            id: "cred-2",
            name: "Failing Provider",
            kind: "ANTHROPIC",
            baseUrl: null,
            keyHint: "key2",
          },
          models: [],
          error: "Authentication failed",
        },
      ],
    };

    const working = response.credentials.filter(c => !c.error);
    const failing = response.credentials.filter(c => c.error);

    expect(working).toHaveLength(1);
    expect(failing).toHaveLength(1);
    expect(failing[0].models).toHaveLength(0);
  });
});
