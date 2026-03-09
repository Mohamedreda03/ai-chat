import { streamText, generateText, UIMessage } from "ai";
import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";
import prisma from "@/lib/prisma";
import { buildLanguageModel } from "@/lib/ai-platforms";

export const maxDuration = 60;

type ChatBody = {
  messages: UIMessage[];
  conversationId?: string;
  credentialId?: string;
  modelId?: string;
  modelLabel?: string;
};

function err(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function classifyError(error: unknown): { message: string; status: number } {
  const e = error as {
    status?: number;
    statusCode?: number;
    message?: string;
    responseBody?: string;
  };
  const status = e.status ?? e.statusCode ?? 500;
  const raw =
    e.responseBody ?? e.message ?? "An error occurred with the AI provider.";

  if (
    status === 429 ||
    raw.toLowerCase().includes("rate limit") ||
    raw.includes("429")
  ) {
    return {
      message: "Rate limit reached. Please wait a moment and try again.",
      status: 429,
    };
  }
  if (
    status === 401 ||
    raw.toLowerCase().includes("invalid api key") ||
    raw.includes("401")
  ) {
    return {
      message: "Invalid API key. Please check your credentials in Settings.",
      status: 401,
    };
  }
  if (status === 403 || raw.includes("403")) {
    return {
      message: "Access denied. You may not have permission to use this model.",
      status: 403,
    };
  }
  if (
    status === 404 ||
    raw.toLowerCase().includes("model not found") ||
    raw.includes("404")
  ) {
    return {
      message: "Model not found. Please verify your model selection.",
      status: 404,
    };
  }
  if (
    raw.toLowerCase().includes("quota") ||
    raw.toLowerCase().includes("billing")
  ) {
    return {
      message: "API quota exceeded. Please check your billing details.",
      status: 402,
    };
  }
  return { message: raw, status: status >= 400 && status < 600 ? status : 500 };
}

async function generateTitle(
  message: string,
  model: ReturnType<typeof buildLanguageModel>,
): Promise<string> {
  try {
    const { text } = await generateText({
      model,
      prompt: `Generate a very short, concise title (3-6 words max) for a conversation starting with this message. Return ONLY the title text, no quotes, no extra punctuation:\n\n${message}`,
    });
    return text.trim().slice(0, 60) || message.slice(0, 60);
  } catch {
    return message.slice(0, 60);
  }
}

export async function POST(req: Request) {
  // ── 1. Parse body ──────────────────────────────────────────────────────────
  let body: ChatBody;
  try {
    body = (await req.json()) as ChatBody;
  } catch {
    return err("Invalid request body.", 400);
  }

  const { messages, conversationId, credentialId, modelId, modelLabel } = body;

  if (!Array.isArray(messages) || messages.length === 0) {
    return err("Messages are required.", 400);
  }

  // ── 2. Resolve model & credential ─────────────────────────────────────────
  try {
    const conversation = conversationId
      ? await prisma.conversation.findUnique({
          where: { id: conversationId },
          select: {
            id: true,
            title: true,
            credentialId: true,
            modelId: true,
            modelLabel: true,
          },
        })
      : null;

    const activeCredentialId =
      credentialId ?? conversation?.credentialId ?? null;
    const activeModelId = modelId ?? conversation?.modelId ?? null;
    const activeModelLabel = modelLabel ?? conversation?.modelLabel ?? null;

    if (!activeCredentialId || !activeModelId) {
      return err("Select a model and connect an API key first.", 400);
    }

    const credential = await prisma.aICredential.findUnique({
      where: { id: activeCredentialId },
      select: { id: true, kind: true, apiKey: true, baseUrl: true },
    });

    if (!credential) {
      return err("Selected AI credential was not found.", 404);
    }

    // ── 3. Update conversation model if changed ──────────────────────────────
    if (conversationId && (credentialId || modelId || modelLabel)) {
      await prisma.conversation.update({
        where: { id: conversationId },
        data: {
          credentialId: activeCredentialId,
          modelId: activeModelId,
          modelLabel: activeModelLabel || activeModelId,
        },
      });
    }

    const languageModel = buildLanguageModel({
      kind: credential.kind,
      apiKey: credential.apiKey,
      baseUrl: credential.baseUrl,
      modelId: activeModelId,
    });

    // ── 4. Save user message (deduplicated by checking last message) ─────────
    if (conversationId) {
      const lastUser = [...messages].reverse().find((m) => m.role === "user");
      if (lastUser) {
        const textContent = lastUser.parts
          .filter((p) => p.type === "text")
          .map((p) => (p as { type: "text"; text: string }).text)
          .join("\n");

        const fileParts = lastUser.parts.filter((p) => p.type === "file") as {
          type: "file";
          url: string;
          mediaType?: string;
          filename?: string;
        }[];

        // Dedup: for file-only messages also match on file URL to avoid collisions
        const existing = await prisma.message.findFirst({
          where: {
            conversationId,
            role: "user",
            content: textContent || "[file]",
            ...(!textContent && fileParts.length > 0
              ? { files: { contains: fileParts[0].url } }
              : {}),
          },
          orderBy: { createdAt: "desc" },
        });
        const fiveSecondsAgo = new Date(Date.now() - 5000);
        const isRecent = existing && existing.createdAt > fiveSecondsAgo;

        if (!isRecent) {
          // Store file metadata as JSON so it can be reconstructed on reload
          const filesJson =
            fileParts.length > 0
              ? JSON.stringify(
                  fileParts.map((f) => ({
                    url: f.url,
                    mediaType: f.mediaType ?? "application/octet-stream",
                    filename: f.filename ?? null,
                  })),
                )
              : null;

          await prisma.message.create({
            data: {
              role: "user",
              content: textContent || "[file]",
              files: filesJson,
              conversationId,
            },
          });
        }

        if (
          conversation?.title === "New Conversation" &&
          (textContent || fileParts.length > 0)
        ) {
          const titleSource =
            textContent || (fileParts[0]?.filename ?? "File attachment");
          generateTitle(titleSource, languageModel)
            .then((title) =>
              prisma.conversation
                .update({ where: { id: conversationId }, data: { title } })
                .catch(() => {}),
            )
            .catch(() => {});
        }
      }
    }

    // ── 5. Build model messages with binary file data ────────────────────────
    // convertToModelMessages converts FileUIPart.url to a URL object which
    // Gemini rejects (only http/https allowed). We build messages manually so
    // local /uploads/ files are passed as raw Uint8Array (inline binary) that
    // providers encode to base64 inline_data correctly.
    type TextPart = { type: "text"; text: string };
    type FilePart = {
      type: "file";
      data: Uint8Array | string | URL;
      mediaType: string;
      filename?: string;
    };
    type ContentPart = TextPart | FilePart;
    type ModelMsg = { role: string; content: ContentPart[] };

    const modelMessages: ModelMsg[] = [];
    for (const msg of messages) {
      const content: ContentPart[] = [];
      for (const part of msg.parts) {
        if (part.type === "text") {
          const tp = part as { type: "text"; text: string };
          content.push({ type: "text", text: tp.text });
        } else if (part.type === "file") {
          const fp = part as {
            type: "file";
            url: string;
            mediaType?: string;
            filename?: string;
          };
          const mediaType = fp.mediaType ?? "application/octet-stream";
          if (fp.url.startsWith("/uploads/")) {
            // Read from disk and pass as Uint8Array — provider encodes to base64
            try {
              const uploadsDir = join(process.cwd(), "public", "uploads");
              const filePath = join(process.cwd(), "public", fp.url.slice(1));
              // Security: reject path traversal attempts (e.g. /uploads/../../etc/passwd)
              if (
                !filePath.startsWith(uploadsDir + "/") &&
                !filePath.startsWith(uploadsDir + "\\")
              ) {
                continue;
              }
              const buffer = await readFile(filePath);
              content.push({
                type: "file",
                data: buffer,
                mediaType,
                ...(fp.filename ? { filename: fp.filename } : {}),
              });
            } catch {
              /* skip unreadable file */
            }
          } else if (fp.url.startsWith("data:")) {
            // Extract plain base64 from data URL
            const base64 = fp.url.slice(fp.url.indexOf(",") + 1);
            content.push({
              type: "file",
              data: base64,
              mediaType,
              ...(fp.filename ? { filename: fp.filename } : {}),
            });
          } else if (fp.url.startsWith("http")) {
            content.push({
              type: "file",
              data: new URL(fp.url),
              mediaType,
              ...(fp.filename ? { filename: fp.filename } : {}),
            });
          }
        }
      }
      if (content.length > 0) {
        modelMessages.push({ role: msg.role, content });
      }
    }

    const result = streamText({
      model: languageModel,
      system: "You are a helpful assistant.",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      messages: modelMessages as any,
      onError({ error }) {
        console.error("[streamText error]", error);
      },
      async onFinish({ text }) {
        if (!conversationId || !text) return;
        try {
          await prisma.message.create({
            data: { role: "assistant", content: text, conversationId },
          });
          await prisma.conversation.update({
            where: { id: conversationId },
            data: { updatedAt: new Date() },
          });
        } catch (dbErr) {
          console.error("[onFinish DB error]", dbErr);
        }
      },
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    const { message, status } = classifyError(error);
    return err(message, status);
  }
}
