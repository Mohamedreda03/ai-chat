"use client";

import { useCallback, useEffect, useState } from "react";
import type { PublicCredential, ModelResponse } from "@/types/api";

export function useCredentials() {
  const [credentials, setCredentials] = useState<PublicCredential[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/ai/credentials", { cache: "no-store" });
      if (!response.ok) throw new Error("Failed to fetch credentials");
      const data = (await response.json()) as PublicCredential[];
      setCredentials(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load credentials";
      setError(message);
      setCredentials([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const deleteCredential = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/ai/credentials/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete credential");
      await refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete credential";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [refresh]);

  return { credentials, loading, error, refresh, deleteCredential };
}

export function useModels() {
  const [modelData, setModelData] = useState<ModelResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/ai/models", { cache: "no-store" });
      if (!response.ok) throw new Error("Failed to fetch models");
      const data = (await response.json()) as ModelResponse;
      setModelData(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load models";
      setError(message);
      setModelData({ credentials: [] });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { modelData, loading, error, refresh };
}
