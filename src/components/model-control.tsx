"use client";

import { KeyRoundIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ModelSelector } from "@/components/model-selector";
import { CredentialForm, CredentialList } from "@/components/credential-manager";
import {
  useAIModels,
  useCredentialManager,
  useModelSelection,
} from "@/hooks/useAIModels";
import type { ModelSelection } from "@/types/api";

interface ModelControlProps {
  value: ModelSelection | null;
  onChange: (value: ModelSelection | null) => void;
  className?: string;
}

/**
 * ModelControl Component
 *
 * Main orchestrator for model and credential management.
 * Coordinates between:
 * - Model selector dropdown
 * - Credential management dialog
 * - Model fetching logic
 *
 * Delegates specific concerns to focused subcomponents:
 * - ModelSelector: Pure selection UI
 * - CredentialForm: Add credentials
 * - CredentialList: Display & delete credentials
 */
export function ModelControl({ value, onChange, className }: ModelControlProps) {
  const { modelData, isLoading, refresh, credentials } = useAIModels();
  const {
    save,
    delete: deleteCredential,
    loadingState,
    error: saveError,
    isLoading: isSaving,
  } = useCredentialManager();

  return (
    <div className={className}>
      <div className="flex items-center gap-2">
        <ModelSelector
          value={value}
          onChange={onChange}
          modelData={modelData}
          isLoading={isLoading}
          onRefresh={() => void refresh()}
        />

        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <KeyRoundIcon className="size-3.5" />
              Models & Keys
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Models & API keys</DialogTitle>
              <DialogDescription>
                Add one or more AI platforms. Models are fetched from each platform
                API, so newly released models appear automatically.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <CredentialForm
                onSave={async (name, kind, apiKey, baseUrl) => {
                  const success = await save(name, kind, apiKey, baseUrl);
                  if (success) {
                    await refresh();
                  }
                  return success;
                }}
                isLoading={isSaving}
                error={saveError}
              />

              <CredentialList
                credentials={credentials}
                isEmpty={credentials.length === 0}
                onDelete={async (credentialId) => {
                  const success = await deleteCredential(credentialId);
                  if (success) {
                    await refresh();
                  }
                  return success;
                }}
                isDeleting={loadingState === "deleting"}
              />
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

// Re-export type for backward compatibility
export type { ModelSelection as ModelSelectionValue } from "@/types/api";
