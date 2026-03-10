import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

const SETTINGS_ID = "default";

export async function GET() {
  const settings = await prisma.userSettings.findUnique({
    where: { id: SETTINGS_ID },
  });
  return NextResponse.json({ systemPrompt: settings?.systemPrompt ?? "" });
}

export async function PATCH(req: Request) {
  let body: { systemPrompt?: string };
  try {
    body = (await req.json()) as { systemPrompt?: string };
  } catch {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }

  const { systemPrompt } = body;
  if (typeof systemPrompt !== "string") {
    return NextResponse.json(
      { error: "systemPrompt must be a string." },
      { status: 400 },
    );
  }

  const settings = await prisma.userSettings.upsert({
    where: { id: SETTINGS_ID },
    update: { systemPrompt },
    create: { id: SETTINGS_ID, systemPrompt },
  });

  return NextResponse.json({ systemPrompt: settings.systemPrompt });
}
