"use client";

import { Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PublicCredential, CredentialKind } from "@/types/api";

const kindLabels: Record<CredentialKind, string> = {
  OPENAI_COMPATIBLE: "OpenAI-compatible",
  ANTHROPIC: "Anthropic",
  GOOGLE: "Google Gemini",
};

interface CredentialListProps {
  credentials: PublicCredential[];
  onDelete: (id: string) => Promise<void>;
  loading: boolean;
}

export function CredentialList({ credentials, onDelete, loading }: CredentialListProps) {
  if (credentials.length === 0) {
    return (
      <div className="space-y-2">
        <h3 className="text-sm font-medium">Connected platforms</h3>
        <p className="text-sm text-muted-foreground">No platform added yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium">Connected platforms</h3>
      {credentials.map((item) => (
        <div
          key={item.id}
          className="flex items-start justify-between gap-2 rounded-lg border px-3 py-2 sm:items-center"
          data-testid={`credential-${item.id}`}
        >
          <div className="min-w-0">
            <p className="text-sm font-medium">{item.name}</p>
            <p className="break-all text-xs text-muted-foreground">
              {kindLabels[item.kind]} - {item.keyHint}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => void onDelete(item.id)}
            disabled={loading}
            data-testid={`delete-credential-${item.id}`}
          >
            <Trash2Icon className="size-3.5" />
          </Button>
        </div>
      ))}
    </div>
  );
}
