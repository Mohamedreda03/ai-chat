"use client";

import { useMemo } from "react";
import type { ModelResponse, ModelSelectionValue } from "@/types/api";

export function useFlatModels(modelData: ModelResponse | null): ModelSelectionValue[] {
  return useMemo(() => {
    if (!modelData) return [];
    return modelData.credentials.flatMap((item) =>
      item.models.map((model) => ({
        credentialId: item.credential.id,
        credentialName: item.credential.name,
        modelId: model.id,
        modelLabel: model.label,
      })),
    );
  }, [modelData]);
}
