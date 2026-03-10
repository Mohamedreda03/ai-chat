"use client";

import { useEffect, useState } from "react";
import {
  ArrowLeftIcon,
  KeyRoundIcon,
  MessageSquareTextIcon,
  ServerIcon,
  Trash2Icon,
  AlertTriangleIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { CredentialForm } from "@/components/features/credential-form";
import { CredentialList } from "@/components/features/credential-list";
import { useCredentials, useModels } from "@/hooks/use-api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function SettingsPage() {
  const router = useRouter();
  const { credentials, loading, error, deleteCredential, refresh } =
    useCredentials();
  const { refresh: refreshModels } = useModels();
  const [saving, setSaving] = useState(false);
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);

  // Custom Instructions
  const [systemPrompt, setSystemPrompt] = useState("");
  const [promptSaving, setPromptSaving] = useState(false);
  const [promptSaved, setPromptSaved] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d: { systemPrompt?: string }) =>
        setSystemPrompt(d.systemPrompt ?? ""),
      )
      .catch(() => {});
  }, []);

  const handleSavePrompt = async () => {
    setPromptSaving(true);
    setPromptSaved(false);
    try {
      await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ systemPrompt }),
      });
      setPromptSaved(true);
      setTimeout(() => setPromptSaved(false), 2500);
    } finally {
      setPromptSaving(false);
    }
  };

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

  const handleDeleteAll = async () => {
    setDeletingAll(true);
    try {
      await fetch("/api/conversations", { method: "DELETE" });
    } catch {
      /* silent */
    } finally {
      setDeletingAll(false);
      setShowDeleteAllDialog(false);
    }
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

          {/* Custom Instructions section */}
          <section className="rounded-xl border bg-card">
            <div className="flex items-center gap-3 border-b px-6 py-4">
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <MessageSquareTextIcon className="size-4" />
              </div>
              <div>
                <h2 className="text-sm font-semibold">Custom Instructions</h2>
                <p className="text-xs text-muted-foreground">
                  Tell the AI how to behave across all conversations
                </p>
              </div>
            </div>
            <div className="p-6 space-y-3">
              <textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                placeholder="e.g. Always respond in Arabic. Be concise. You are an expert software engineer."
                rows={5}
                className="w-full resize-none rounded-lg border bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  These instructions are added to every new message as a system
                  prompt.
                </p>
                <Button
                  size="sm"
                  onClick={handleSavePrompt}
                  disabled={promptSaving}
                  className="shrink-0"
                >
                  {promptSaved
                    ? "Saved ✓"
                    : promptSaving
                      ? "Saving..."
                      : "Save"}
                </Button>
              </div>
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

          {/* Danger zone */}
          <section className="rounded-xl border border-destructive/30 bg-card">
            <div className="flex items-center gap-3 border-b border-destructive/20 px-6 py-4">
              <div className="flex size-8 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
                <AlertTriangleIcon className="size-4" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-destructive">
                  Danger Zone
                </h2>
                <p className="text-xs text-muted-foreground">
                  Irreversible actions — proceed with caution
                </p>
              </div>
            </div>
            <div className="p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium">
                    Delete all conversations
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Permanently removes every conversation and its messages.
                  </p>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setShowDeleteAllDialog(true)}
                  className="shrink-0"
                >
                  <Trash2Icon className="size-3.5" />
                  Delete all
                </Button>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Confirm delete-all dialog */}
      <Dialog
        open={showDeleteAllDialog}
        onOpenChange={(open) => !open && setShowDeleteAllDialog(false)}
      >
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Delete all conversations?</DialogTitle>
            <DialogDescription>
              This will permanently delete every conversation and all messages.
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteAllDialog(false)}
              disabled={deletingAll}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAll}
              disabled={deletingAll}
            >
              {deletingAll ? "Deleting..." : "Delete all"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
