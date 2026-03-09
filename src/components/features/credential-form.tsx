"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CredentialKind } from "@/types/api";

interface CredentialFormProps {
  onSave: (data: {
    name: string;
    kind: CredentialKind;
    apiKey: string;
    baseUrl: string | null;
  }) => Promise<void>;
  loading: boolean;
}

export function CredentialForm({ onSave, loading }: CredentialFormProps) {
  const [name, setName] = useState("");
  const [kind, setKind] = useState<CredentialKind>("OPENAI_COMPATIBLE");
  const [apiKey, setApiKey] = useState("");

  const canSave = name.trim() && apiKey.trim();

  const handleSave = async () => {
    if (!canSave || loading) return;

    await onSave({
      name: name.trim(),
      kind,
      apiKey: apiKey.trim(),
      baseUrl: null,
    });

    // Reset form
    setName("");
    setApiKey("");
  };

  return (
    <div className="space-y-2 rounded-lg border p-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <Input
          placeholder="Platform name (e.g. OpenAI, Groq)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={loading}
          data-testid="credential-name"
        />
        <Select
          value={kind}
          onValueChange={(value) => setKind(value as CredentialKind)}
          disabled={loading}
        >
          <SelectTrigger data-testid="credential-kind">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="OPENAI_COMPATIBLE">OpenAI</SelectItem>
            <SelectItem value="ANTHROPIC">Anthropic</SelectItem>
            <SelectItem value="GOOGLE">Google Gemini</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Input
        type="password"
        placeholder="API key"
        value={apiKey}
        onChange={(e) => setApiKey(e.target.value)}
        disabled={loading}
        data-testid="credential-apikey"
      />

      <Button
        onClick={handleSave}
        disabled={!canSave || loading}
        className="w-full sm:w-auto"
        data-testid="save-credential"
      >
        Save API key
      </Button>
    </div>
  );
}
