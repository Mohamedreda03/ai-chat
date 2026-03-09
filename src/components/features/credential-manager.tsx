"use client";

import { useState } from "react";
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
import { CredentialForm } from "./credential-form";
import { CredentialList } from "./credential-list";
import { useCredentials } from "@/hooks/use-api";

interface CredentialManagerProps {
  onSaved?: () => Promise<void>;
}

export function CredentialManager({ onSaved }: CredentialManagerProps) {
  const { credentials, loading, error, deleteCredential, refresh } = useCredentials();
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
        const errorData = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(errorData?.error || "Failed to save credential");
      }

      await refresh();
      if (onSaved) await onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="w-full sm:w-auto"
          data-testid="open-credential-manager"
        >
          <KeyRoundIcon className="size-3.5" />
          Models & Keys
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[calc(100%-1rem)] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Models & API keys</DialogTitle>
          <DialogDescription>
            Add one or more AI platforms. Models are fetched from each platform API,
            so newly released models appear automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[75dvh] space-y-4 overflow-y-auto pr-1">
          <CredentialForm onSave={handleSave} loading={saving || loading} />
          <CredentialList
            credentials={credentials}
            onDelete={deleteCredential}
            loading={loading}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
