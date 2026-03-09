import { z } from "zod";

export const CredentialKindSchema = z.enum([
  "OPENAI_COMPATIBLE",
  "ANTHROPIC",
  "GOOGLE",
]);

export type CredentialKind = z.infer<typeof CredentialKindSchema>;

export const CredentialFormSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Platform name is required").max(100),
  kind: CredentialKindSchema,
  apiKey: z.string().min(1, "API key is required"),
  baseUrl: z.string().url("Invalid URL").optional().or(z.literal("")),
});

export type CredentialFormData = z.infer<typeof CredentialFormSchema>;

export const PublicCredentialSchema = z.object({
  id: z.string(),
  name: z.string(),
  kind: CredentialKindSchema,
  baseUrl: z.string().nullable(),
  keyHint: z.string(),
});

export type PublicCredential = z.infer<typeof PublicCredentialSchema>;

export const ModelOptionSchema = z.object({
  id: z.string(),
  label: z.string(),
});

export type ModelOption = z.infer<typeof ModelOptionSchema>;

export const ModelSelectionValueSchema = z.object({
  credentialId: z.string(),
  modelId: z.string(),
  modelLabel: z.string(),
  credentialName: z.string(),
});

export type ModelSelectionValue = z.infer<typeof ModelSelectionValueSchema>;

export const CredentialsWithModelsResponseSchema = z.object({
  credentials: z.array(
    z.object({
      credential: PublicCredentialSchema,
      models: z.array(ModelOptionSchema),
      error: z.string().nullable(),
    }),
  ),
});

export type CredentialsWithModelsResponse = z.infer<typeof CredentialsWithModelsResponseSchema>;
export type ModelResponse = CredentialsWithModelsResponse; // Alias for backward compatibility

export const ConversationCreateSchema = z.object({
  title: z.string().optional(),
  credentialId: z.string().optional(),
  modelId: z.string().optional(),
  modelLabel: z.string().optional(),
});

export type ConversationCreate = z.infer<typeof ConversationCreateSchema>;

export const ChatRequestSchema = z.object({
  messages: z.array(z.any()), // UIMessage type from AI SDK
  conversationId: z.string().optional(),
  credentialId: z.string().optional(),
  modelId: z.string().optional(),
  modelLabel: z.string().optional(),
});

export type ChatRequest = z.infer<typeof ChatRequestSchema>;

export const SaveCredentialRequestSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Platform name is required"),
  kind: CredentialKindSchema,
  apiKey: z.string().min(1, "API key is required"),
  baseUrl: z.string().url().optional().or(z.literal("")),
});

export type SaveCredentialRequest = z.infer<typeof SaveCredentialRequestSchema>;

export const SaveCredentialResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  kind: CredentialKindSchema,
  baseUrl: z.string().nullable(),
  keyHint: z.string(),
});

export type SaveCredentialResponse = z.infer<typeof SaveCredentialResponseSchema>;

// Loading states for UI
export type LoadingState = 
  | "idle" 
  | "fetching-credentials" 
  | "fetching-models" 
  | "saving" 
  | "deleting"
  | "loading";

// Error type for model control
export interface ModalControlError {
  credentialId?: string;
  modelId?: string;
  message: string;
}

// Type aliases for backward compatibility
export type ModelSelection = ModelSelectionValue;
