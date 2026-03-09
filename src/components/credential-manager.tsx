import React, { useState } from "react";
import { Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { PublicCredential } from "@/types/api";
import { CREDENTIAL_KINDS, type CredentialKind } from "@/lib/ai-platforms";

const KIND_LABELS: Record<CredentialKind, string> = {
  OPENAI_COMPATIBLE: "OpenAI",
  ANTHROPIC: "Anthropic",
  GOOGLE: "Google Gemini",
};

interface CredentialFormProps {
  onSave: (
    name: string,
    kind: string,
    apiKey: string,
    baseUrl: string | null,
  ) => Promise<boolean>;
  isLoading: boolean;
  error: string | null;
}

/**
 * Form component for adding new credentials
 */
export function CredentialForm({
  onSave,
  isLoading,
  error,
}: CredentialFormProps) {
  const [name, setName] = useState("");
  const [kind, setKind] = useState<CredentialKind>("OPENAI_COMPATIBLE");
  const [baseUrl, setBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");

  const canSave = name.trim() && apiKey.trim();

  const handleSave = async () => {
    if (!canSave || isLoading) return;
    const success = await onSave(name, kind, apiKey, baseUrl || null);
    if (success) {
      setName("");
      setApiKey("");
      setBaseUrl("");
    }
  };

  return (
    <div className="space-y-2 rounded-lg border p-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <Input
          placeholder="Platform name (e.g. OpenAI, Groq)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={isLoading}
        />
        <Select
          value={kind}
          onValueChange={(value) => setKind(value as CredentialKind)}
          disabled={isLoading}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CREDENTIAL_KINDS.map((k) => (
              <SelectItem key={k} value={k}>
                {KIND_LABELS[k]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {kind === "OPENAI_COMPATIBLE" && (
        <Input
          placeholder="Base URL (optional), e.g. https://api.openai.com/v1"
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value)}
          disabled={isLoading}
        />
      )}

      <Input
        type="password"
        placeholder="API key"
        value={apiKey}
        onChange={(e) => setApiKey(e.target.value)}
        disabled={isLoading}
      />

      <Button
        onClick={() => void handleSave()}
        disabled={!canSave || isLoading}
      >
        Save API key
      </Button>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

interface CredentialListProps {
  credentials: PublicCredential[];
  isEmpty: boolean;
  onDelete: (credentialId: string) => Promise<boolean>;
  isDeleting: boolean;
}

/**
 * Display list of saved credentials with delete option
 */
export function CredentialList({
  credentials,
  isEmpty,
  onDelete,
  isDeleting,
}: CredentialListProps) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium">Connected platforms</h3>
      {isEmpty ? (
        <p className="text-sm text-muted-foreground">No platform added yet.</p>
      ) : (
        credentials.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between rounded-lg border px-3 py-2"
          >
            <div>
              <p className="text-sm font-medium">{item.name}</p>
              <p className="text-xs text-muted-foreground">
                {KIND_LABELS[item.kind]} - {item.keyHint}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => void onDelete(item.id)}
              disabled={isDeleting}
            >
              <Trash2Icon className="size-3.5" />
            </Button>
          </div>
        ))
      )}
    </div>
  );
}
