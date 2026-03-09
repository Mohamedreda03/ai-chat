"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDownIcon, CpuIcon, SettingsIcon } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import type { ModelSelectionValue, ModelResponse } from "@/types/api";

interface InlineModelPickerProps {
  value: ModelSelectionValue | null;
  modelData: ModelResponse | null;
  flatModels: ModelSelectionValue[];
  loading: boolean;
  onChange: (value: ModelSelectionValue | null) => void;
  onRefresh: () => void;
}

export function InlineModelPicker({
  value,
  modelData,
  flatModels,
  loading,
  onChange,
  onRefresh,
}: InlineModelPickerProps) {
  const [open, setOpen] = useState(false);

  const handleSelect = (model: ModelSelectionValue) => {
    onChange(model);
    setOpen(false);
  };

  const label = value
    ? value.modelLabel
    : loading
      ? "Loading..."
      : "Select model";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex max-w-48 items-center gap-1.5 rounded-full border bg-muted/50 px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
          disabled={loading && flatModels.length === 0}
        >
          <CpuIcon className="size-3 shrink-0" />
          <span className="truncate">{label}</span>
          <ChevronDownIcon className="size-3 shrink-0 opacity-60" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-72 p-0"
        align="start"
        side="top"
        sideOffset={8}
      >
        <Command>
          <CommandInput placeholder="Search models..." />
          <CommandList>
            <CommandEmpty>
              {flatModels.length === 0 ? (
                <div className="space-y-2 px-2">
                  <p className="text-muted-foreground">No models available</p>
                  <p className="text-xs text-muted-foreground">
                    Add an API key in Settings to get started
                  </p>
                </div>
              ) : (
                "No models found."
              )}
            </CommandEmpty>
            {modelData?.credentials.map((item) => (
              <CommandGroup
                key={item.credential.id}
                heading={item.credential.name}
              >
                {item.models.map((model) => {
                  const isSelected =
                    value?.credentialId === item.credential.id &&
                    value?.modelId === model.id;
                  return (
                    <CommandItem
                      key={`${item.credential.id}::${model.id}`}
                      value={`${model.label} ${item.credential.name}`}
                      data-checked={isSelected}
                      onSelect={() =>
                        handleSelect({
                          credentialId: item.credential.id,
                          credentialName: item.credential.name,
                          modelId: model.id,
                          modelLabel: model.label,
                        })
                      }
                    >
                      <CpuIcon className="size-3.5 text-muted-foreground" />
                      <span className="truncate">{model.label}</span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            ))}
          </CommandList>
          <CommandSeparator />
          <div className="p-1">
            <Link
              href="/chat/settings"
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <SettingsIcon className="size-3.5" />
              Manage API keys...
            </Link>
          </div>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
