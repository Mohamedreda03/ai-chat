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

// POST /api/conversations — create a new conversation
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const conversation = await prisma.conversation.create({
    data: { title: body.title ?? "New Conversation" },
  });
  return NextResponse.json(conversation, { status: 201 });
}
