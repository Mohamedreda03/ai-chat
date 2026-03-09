import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";

export const CREDENTIAL_KINDS = [
  "OPENAI_COMPATIBLE",
  "ANTHROPIC",
  "GOOGLE",
] as const;

export type CredentialKind = (typeof CREDENTIAL_KINDS)[number];

export type PublicCredential = {
  id: string;
  name: string;
  kind: CredentialKind;
  baseUrl: string | null;
  keyHint: string;
};

export type ModelOption = {
  id: string;
  label: string;
};

function normalizeBaseUrl(baseUrl: string | null | undefined) {
  if (!baseUrl) return "https://api.openai.com/v1";
  return baseUrl.replace(/\/+$/, "");
}

export function maskApiKey(apiKey: string) {
  if (!apiKey) return "";
  if (apiKey.length <= 8) return "*".repeat(apiKey.length);
  return `${apiKey.slice(0, 4)}...${apiKey.slice(-4)}`;
}

async function fetchOpenAICompatibleModels(
  apiKey: string,
  baseUrl: string | null,
): Promise<ModelOption[]> {
  const endpoint = `${normalizeBaseUrl(baseUrl)}/models`;
  const response = await fetch(endpoint, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Model listing failed (${response.status})`);
  }

  const data = (await response.json()) as {
    data?: Array<{ id?: string }>;
  };

  const models = (data.data ?? [])
    .map((item) => item.id?.trim())
    .filter((id): id is string => Boolean(id))
    .sort((a, b) => a.localeCompare(b));

  return models.map((id) => ({ id, label: id }));
}

async function fetchAnthropicModels(apiKey: string): Promise<ModelOption[]> {
  const response = await fetch("https://api.anthropic.com/v1/models", {
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Model listing failed (${response.status})`);
  }

  const data = (await response.json()) as {
    data?: Array<{ id?: string; display_name?: string }>;
  };

  const items = (data.data ?? [])
    .map((model) => {
      const id = model.id?.trim();
      if (!id) return null;
      return {
        id,
        label: model.display_name?.trim() || id,
      };
    })
    .filter((item): item is ModelOption => Boolean(item))
    .sort((a, b) => a.label.localeCompare(b.label));

  return items;
}

async function fetchGoogleModels(apiKey: string): Promise<ModelOption[]> {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`;
  const response = await fetch(endpoint, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Model listing failed (${response.status})`);
  }

  const data = (await response.json()) as {
    models?: Array<{
      name?: string;
      displayName?: string;
      supportedGenerationMethods?: string[];
    }>;
  };

  const items = (data.models ?? [])
    .filter((model) =>
      (model.supportedGenerationMethods ?? []).some((method) =>
        ["generateContent", "streamGenerateContent"].includes(method),
      ),
    )
    .map((model) => {
      const rawName = model.name?.replace(/^models\//, "").trim();
      if (!rawName) return null;
      return {
        id: rawName,
        label: model.displayName?.trim() || rawName,
      };
    })
    .filter((item): item is ModelOption => Boolean(item))
    .sort((a, b) => a.label.localeCompare(b.label));

  return items;
}

export async function fetchModelsForCredential(input: {
  kind: CredentialKind;
  apiKey: string;
  baseUrl: string | null;
}) {
  switch (input.kind) {
    case "OPENAI_COMPATIBLE":
      return fetchOpenAICompatibleModels(input.apiKey, input.baseUrl);
    case "ANTHROPIC":
      return fetchAnthropicModels(input.apiKey);
    case "GOOGLE":
      return fetchGoogleModels(input.apiKey);
    default:
      return [];
  }
}

export function buildLanguageModel(input: {
  kind: CredentialKind;
  apiKey: string;
  baseUrl: string | null;
  modelId: string;
}): LanguageModel {
  switch (input.kind) {
    case "OPENAI_COMPATIBLE": {
      const openai = createOpenAI({
        apiKey: input.apiKey,
        baseURL: normalizeBaseUrl(input.baseUrl),
      });
      return openai(input.modelId);
    }
    case "ANTHROPIC": {
      const anthropic = createAnthropic({ apiKey: input.apiKey });
      return anthropic(input.modelId);
    }
    case "GOOGLE": {
      const google = createGoogleGenerativeAI({ apiKey: input.apiKey });
      return google(input.modelId);
    }
    default: {
      throw new Error("Unsupported credential kind");
    }
  }
}
