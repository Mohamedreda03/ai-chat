"use client";

import { RefreshCcwIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ModelSelectionValue, ModelResponse } from "@/types/api";

interface ModelSelectorProps {
  value: ModelSelectionValue | null;
  modelData: ModelResponse | null;
  flatModels: ModelSelectionValue[];
  loading: boolean;
  onChange: (value: ModelSelectionValue | null) => void;
  onRefresh: () => void;
}

export function ModelSelector({
  value,
  modelData,
  flatModels,
  loading,
  onChange,
  onRefresh,
}: ModelSelectorProps) {
  const selectValue = value ? `${value.credentialId}::${value.modelId}` : "";

  const handleValueChange = (newValue: string) => {
    const [credentialId, modelId] = newValue.split("::");
    const found = flatModels.find(
      (item) => item.credentialId === credentialId && item.modelId === modelId,
    );
    if (found) onChange(found);
  };

  return (
    <div className="flex min-w-0 flex-1 items-center gap-2">
      <Select
        value={selectValue || undefined}
        onValueChange={handleValueChange}
        disabled={loading || flatModels.length === 0}
      >
        <SelectTrigger size="sm" className="w-full min-w-0 sm:max-w-[260px] sm:min-w-[180px]">
          <SelectValue
            placeholder={
              loading ? "Loading models..." : "Add API key to use models"
            }
          />
        </SelectTrigger>
        <SelectContent>
          {modelData?.credentials.map((item) => (
            <div key={item.credential.id}>
              {item.models.map((model) => (
                <SelectItem
                  key={`${item.credential.id}::${model.id}`}
                  value={`${item.credential.id}::${model.id}`}
                >
                  {model.label} - {item.credential.name}
                </SelectItem>
              ))}
            </div>
          ))}
        </SelectContent>
      </Select>

      <Button variant="ghost" size="icon-sm" onClick={onRefresh} disabled={loading}>
        <RefreshCcwIcon className="size-3.5" />
      </Button>
    </div>
  );
}
