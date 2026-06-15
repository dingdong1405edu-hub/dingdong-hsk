import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { gradeSpeaking, isGradingConfigured } from "@/lib/claude";
import { z } from "zod";

const schema = z.object({
  transcript: z.string(),
  referenceText: z.string().nullable(),
  part: z.enum(["repeat", "read", "answer"]),
  question: z.string().nullable(),
  hskLevel: z.string(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!isGradingConfigured()) {
    return NextResponse.json(
      { error: "Chức năng chấm điểm AI chưa được cấu hình (thiếu GROQ_API_KEY)." },
      { status: 503 }
    );
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  try {
    const result = await gradeSpeaking(parsed.data);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Grading failed" }, { status: 500 });
  }
}
