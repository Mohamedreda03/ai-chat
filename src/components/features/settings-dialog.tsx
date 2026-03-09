"use client";

import { useState } from "react";
import { SettingsIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CredentialForm } from "./credential-form";
import { CredentialList } from "./credential-list";
import { useCredentials } from "@/hooks/use-api";
import { useModels } from "@/hooks/use-api";

interface SettingsDialogProps {
  trigger?: React.ReactNode;
  onCredentialsChanged?: () => Promise<void>;
}

export function SettingsDialog({
  trigger,
  onCredentialsChanged,
}: SettingsDialogProps) {
  const { credentials, loading, error, deleteCredential, refresh } =
    useCredentials();
  const { refresh: refreshModels } = useModels();
  const [saving, setSaving] = useState(false);

  const handleSave = async (data: {
    name: string;
    kind: string;
    apiKey: string;
    baseUrl: string | null;
  }) => {
    setSaving(true);
    try {
      const response = await fetch("/api/ai/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(errorData?.error || "Failed to save credential");
      }

      await refresh();
      await refreshModels();
      if (onCredentialsChanged) await onCredentialsChanged();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteCredential(id);
    await refreshModels();
    if (onCredentialsChanged) await onCredentialsChanged();
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="ghost" size="sm" className="gap-2">
            <SettingsIcon className="size-4" />
            Settings
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-[calc(100%-1rem)] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Manage API keys and connected AI platforms. Models are fetched
            automatically from each platform.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[70dvh] space-y-4 overflow-y-auto pr-1">
          <CredentialForm onSave={handleSave} loading={saving || loading} />
          <CredentialList
            credentials={credentials}
            onDelete={handleDelete}
            loading={loading}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
