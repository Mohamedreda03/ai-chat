"use client";

import { useState } from "react";
import { ArrowLeftIcon, KeyRoundIcon, ServerIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { CredentialForm } from "@/components/features/credential-form";
import { CredentialList } from "@/components/features/credential-list";
import { useCredentials, useModels } from "@/hooks/use-api";

export default function SettingsPage() {
  const router = useRouter();
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
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteCredential(id);
    await refreshModels();
  };

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-background pt-14 md:pt-0">
      <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-8 sm:py-12">
        {/* Header */}
        <div className="mb-10 flex items-start gap-4">
          <button
            onClick={() => router.back()}
            className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-lg border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <ArrowLeftIcon className="size-4" />
          </button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Connect AI platforms by adding your API keys. Models are fetched
              automatically from each provider.
            </p>
          </div>
        </div>

        <div className="space-y-8">
          {/* Add platform section */}
          <section className="rounded-xl border bg-card">
            <div className="flex items-center gap-3 border-b px-6 py-4">
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <KeyRoundIcon className="size-4" />
              </div>
              <div>
                <h2 className="text-sm font-semibold">Add API Key</h2>
                <p className="text-xs text-muted-foreground">
                  Connect a new AI platform
                </p>
              </div>
            </div>
            <div className="p-6">
              <CredentialForm onSave={handleSave} loading={saving || loading} />
            </div>
          </section>

          {/* Connected platforms section */}
          <section className="rounded-xl border bg-card">
            <div className="flex items-center gap-3 border-b px-6 py-4">
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <ServerIcon className="size-4" />
              </div>
              <div>
                <h2 className="text-sm font-semibold">Connected Platforms</h2>
                <p className="text-xs text-muted-foreground">
                  {credentials.length === 0
                    ? "No platforms connected yet"
                    : `${credentials.length} platform${credentials.length !== 1 ? "s" : ""} connected`}
                </p>
              </div>
            </div>
            <div className="p-6">
              <CredentialList
                credentials={credentials}
                onDelete={handleDelete}
                loading={loading}
              />
              {error && (
                <p className="mt-4 text-sm text-destructive">{error}</p>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
