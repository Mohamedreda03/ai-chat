import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

interface Params {
  params: Promise<{ id: string }>;
}

// POST /api/conversations/[id]/error — upsert a persisted error message
export async function POST(req: Request, { params }: Params) {
  const { id } = await params;
  const { message } = (await req.json()) as { message: string };

  // Replace any existing error messages for this conversation
  await prisma.message.deleteMany({
    where: { conversationId: id, role: "error" },
  });

  const errorMsg = await prisma.message.create({
    data: { role: "error", content: message, conversationId: id },
  });

  return NextResponse.json(errorMsg, { status: 201 });
}

// DELETE /api/conversations/[id]/error — clear persisted error
export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params;
  await prisma.message.deleteMany({
    where: { conversationId: id, role: "error" },
  });
  return new NextResponse(null, { status: 204 });
}
