import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/conversations — list all conversations newest first
export async function GET() {
  const conversations = await prisma.conversation.findMany({
    orderBy: { updatedAt: "desc" },
    select: { id: true, title: true, updatedAt: true },
  });
  return NextResponse.json(conversations);
}

// DELETE /api/conversations — delete all conversations
export async function DELETE() {
  await prisma.conversation.deleteMany({});
  return NextResponse.json({ success: true });
}

// POST /api/conversations — create a new conversation
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    title?: string;
    credentialId?: string;
    modelId?: string;
    modelLabel?: string;
  };

  // Validate credentialId if provided — clear it instead of causing a FK error
  let credentialId: string | null = null;
  if (body.credentialId) {
    const exists = await prisma.aICredential.findUnique({
      where: { id: body.credentialId },
      select: { id: true },
    });
    if (exists) credentialId = body.credentialId;
  }

  const conversation = await prisma.conversation.create({
    data: {
      title: body.title ?? "New Conversation",
      credentialId,
      modelId: credentialId ? (body.modelId ?? null) : null,
      modelLabel: credentialId ? (body.modelLabel ?? null) : null,
    },
  });
  return NextResponse.json(conversation, { status: 201 });
}
