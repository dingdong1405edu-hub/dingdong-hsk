import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { gradeWriting, isGradingConfigured } from "@/lib/groq";
import { z } from "zod";

const schema = z.object({
  submission: z.string(),
  hskLevel: z.string(),
  taskPrompt: z.string(),
  minChars: z.number(),
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
    const result = await gradeWriting(parsed.data);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Grading failed" }, { status: 500 });
  }
}
