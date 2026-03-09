import type {
  PublicCredential,
  CredentialsWithModelsResponse,
  SaveCredentialRequest,
  SaveCredentialResponse,
} from "@/types/api";

/**
 * API Client for AI platform credentials and models
 * Handles all communication with backend API
 */

class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    try {
      const data = (await response.json()) as { error?: string };
      throw new ApiError(
        response.status,
        response.statusText,
        data.error || `HTTP ${response.status}`,
      );
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(
        response.status,
        response.statusText,
        `HTTP ${response.status}: ${response.statusText}`,
      );
    }
  }

  return (await response.json()) as T;
}

/**
 * Fetch all saved credentials (API keys masked)
 */
export async function fetchCredentials(): Promise<PublicCredential[]> {
  const response = await fetch("/api/ai/credentials", {
    cache: "no-store",
  });
  return handleResponse<PublicCredential[]>(response);
}

/**
 * Fetch available models from all connected platforms
 */
export async function fetchModels(): Promise<CredentialsWithModelsResponse> {
  const response = await fetch("/api/ai/models", {
    cache: "no-store",
  });
  return handleResponse<CredentialsWithModelsResponse>(response);
}

/**
 * Save a new credential or update existing one
 */
export async function saveCredential(
  request: SaveCredentialRequest,
): Promise<SaveCredentialResponse> {
  const response = await fetch("/api/ai/credentials", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  return handleResponse<SaveCredentialResponse>(response);
}

/**
 * Delete a credential by ID
 */
export async function deleteCredential(credentialId: string): Promise<void> {
  const response = await fetch(`/api/ai/credentials/${credentialId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new ApiError(
      response.status,
      response.statusText,
      `Failed to delete credential: HTTP ${response.status}`,
    );
  }
}

export { ApiError };
