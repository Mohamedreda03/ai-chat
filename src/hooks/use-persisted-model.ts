"use client";

import { useEffect, useState, useCallback } from "react";
import type { ModelSelectionValue } from "@/types/api";

const STORAGE_KEY = "selected-model";

export function usePersistedModel(initialModel?: ModelSelectionValue | null) {
  const [selectedModel, setSelectedModel] = useState<ModelSelectionValue | null>(
    initialModel || null,
  );

  // Load from localStorage on mount (only if no initialModel)
  useEffect(() => {
    if (initialModel) {
      setSelectedModel(initialModel);
      return;
    }

    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return;

    try {
      const parsed = JSON.parse(stored) as ModelSelectionValue;
      setSelectedModel(parsed);
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [initialModel]);

  // Persist to localStorage whenever it changes
  useEffect(() => {
    if (!selectedModel) {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(selectedModel));
  }, [selectedModel]);

  const clearModel = useCallback(() => {
    setSelectedModel(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return { selectedModel, setSelectedModel, clearModel };
}
