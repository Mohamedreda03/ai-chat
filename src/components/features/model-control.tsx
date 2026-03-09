"use client";

import { useEffect } from "react";
import { InlineModelPicker } from "@/components/features/inline-model-picker";
import { useModels } from "@/hooks/use-api";
import { useFlatModels } from "@/hooks/use-flat-models";
import type { ModelSelectionValue } from "@/types/api";

export type { ModelSelectionValue };

interface ModelControlProps {
  value: ModelSelectionValue | null;
  onChange: (value: ModelSelectionValue | null) => void;
  className?: string;
}

export function ModelControl({
  value,
  onChange,
  className,
}: ModelControlProps) {
  const { modelData, loading, refresh } = useModels();
  const flatModels = useFlatModels(modelData);

  // Auto-select first available model if none selected
  useEffect(() => {
    if (flatModels.length === 0) {
      if (value) onChange(null);
      return;
    }

    if (!value) {
      onChange(flatModels[0]);
      return;
    }

    // Verify selected model still exists
    const stillExists = flatModels.some(
      (item) =>
        item.credentialId === value.credentialId &&
        item.modelId === value.modelId,
    );

    if (!stillExists) onChange(flatModels[0]);
  }, [flatModels, onChange, value]);

  return (
    <div className={className}>
      <InlineModelPicker
        value={value}
        modelData={modelData}
        flatModels={flatModels}
        loading={loading}
        onChange={onChange}
        onRefresh={refresh}
      />
    </div>
  );
}
