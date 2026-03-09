import React from "react";
import { RefreshCcwIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ModelSelection, CredentialsWithModelsResponse } from "@/types/api";

interface ModelSelectorProps {
  value: ModelSelection | null;
  onChange: (value: ModelSelection | null) => void;
  modelData: CredentialsWithModelsResponse | null;
  isLoading: boolean;
  onRefresh: () => void;
}

/**
 * Pure model selector dropdown component
 * Displays available models grouped by platform
 */
export function ModelSelector({
  value,
  onChange,
  modelData,
  isLoading,
  onRefresh,
}: ModelSelectorProps) {
  const flatModels = React.useMemo(() => {
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

  const selectValue = value ? `${value.credentialId}::${value.modelId}` : "";

  const handleValueChange = (newValue: string) => {
    const [credentialId, modelId] = newValue.split("::");
    const found = flatModels.find(
      (item) => item.credentialId === credentialId && item.modelId === modelId,
    );
    if (found) onChange(found);
  };

  return (
    <div className="flex items-center gap-2">
      <Select
        value={selectValue || undefined}
        onValueChange={handleValueChange}
        disabled={isLoading || flatModels.length === 0}
      >
        <SelectTrigger size="sm" className="max-w-[260px] min-w-[180px]">
          <SelectValue
            placeholder={
              isLoading ? "Loading models..." : "Add API key to use models"
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

      <Button variant="ghost" size="icon-sm" onClick={onRefresh} disabled={isLoading}>
        <RefreshCcwIcon className="size-3.5" />
      </Button>
    </div>
  );
}
