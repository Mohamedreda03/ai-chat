import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { LoadingState, ModalControlError } from "@/types/api";
import * as apiClient from "@/lib/api-client";
import type {
  PublicCredential,
  CredentialsWithModelsResponse,
  ModelOption,
  ModelSelection,
} from "@/types/api";

/**
 * Hook: Manage AI models and credentials fetching
 * Handles loading states, error states, and data normalization
 */
export function useAIModels() {
  const [credentials, setCredentials] = useState<PublicCredential[]>([]);
  const [modelData, setModelData] = useState<CredentialsWithModelsResponse | null>(null);
  const [loadingState, setLoadingState] = useState<LoadingState>("idle");
  const [error, setError] = useState<ModalControlError | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const refresh = useCallback(async () => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    setLoadingState("fetching-credentials");
    setError(null);

    try {
      const [creds, models] = await Promise.all([
        apiClient.fetchCredentials(),
        apiClient.fetchModels(),
      ]);

      setCredentials(creds);
      setModelData(models);
      setLoadingState("idle");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load models";
      setError({
        message,
      });
      setLoadingState("idle");
      setCredentials([]);
      setModelData({ credentials: [] });
    }
  }, []);

  useEffect(() => {
    void refresh();
    return () => abortControllerRef.current?.abort();
  }, [refresh]);

  const isLoading = loadingState !== "idle";

  return {
    credentials,
    modelData,
    isLoading,
    loadingState,
    error,
    refresh,
  };
}

/**
 * Hook: Manage credential lifecycle (create, delete)
 */
export function useCredentialManager() {
  const [loadingState, setLoadingState] = useState<LoadingState>("idle");
  const [error, setError] = useState<string | null>(null);

  const save = useCallback(
    async (
      name: string,
      kind: string,
      apiKey: string,
      baseUrl: string | null,
    ) => {
      setLoadingState("saving");
      setError(null);

      try {
        await apiClient.saveCredential({
          name: name.trim(),
          kind: kind as any,
          apiKey: apiKey.trim(),
          baseUrl: baseUrl?.trim() || undefined,
        });
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to save credential";
        setError(message);
        return false;
      } finally {
        setLoadingState("idle");
      }
    },
    [],
  );

  const delete_ = useCallback(async (credentialId: string) => {
    setLoadingState("deleting");
    setError(null);

    try {
      await apiClient.deleteCredential(credentialId);
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete credential";
      setError(message);
      return false;
    } finally {
      setLoadingState("idle");
    }
  }, []);

  return {
    save,
    delete: delete_,
    loadingState,
    error,
    isLoading: loadingState !== "idle",
  };
}

/**
 * Hook: Manage model selection with persistence
 */
export function useModelSelection() {
  const [selected, setSelected] = useState<ModelSelection | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem("selected-model");
    if (!stored) return;
    try {
      setSelected(JSON.parse(stored));
    } catch {
      // Ignore parse errors
    }
  }, []);

  // Persist to localStorage when selected changes
  useEffect(() => {
    if (!selected) return;
    localStorage.setItem("selected-model", JSON.stringify(selected));
  }, [selected]);

  return { selected, setSelected };
}

/**
 * Hook: Compute flat model list from grouped data
 */
export function useFlatModels(modelData: CredentialsWithModelsResponse | null): ModelSelection[] {
  return useMemo(
    () => {
      if (!modelData) return [];

      return modelData.credentials.flatMap((item) =>
        item.models.map((model) => ({
          credentialId: item.credential.id,
          credentialName: item.credential.name,
          modelId: model.id,
          modelLabel: model.label,
        })),
      );
    },
    [modelData],
  );
}
