import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

interface Params {
  params: Promise<{ id: string }>;
}

// GET /api/conversations/[id] — fetch a single conversation with messages
export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  const conversation = await prisma.conversation.findUnique({
    where: { id },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!conversation) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(conversation);
}

// PATCH /api/conversations/[id] — update title
export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params;
  const { title } = await req.json();
  const conversation = await prisma.conversation.update({
    where: { id },
    data: { title },
  });
  return NextResponse.json(conversation);
}

// DELETE /api/conversations/[id]
export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params;
  await prisma.conversation.deleteMany({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
