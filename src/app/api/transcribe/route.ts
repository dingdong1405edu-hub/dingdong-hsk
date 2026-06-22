import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { transcribeAudio, isTranscriptionConfigured } from "@/lib/voxtral";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!isTranscriptionConfigured()) {
    return NextResponse.json(
      { error: "Chức năng nhận dạng giọng nói chưa được cấu hình (thiếu VOXTRAL_API_KEY)." },
      { status: 503 }
    );
  }

  const formData = await req.formData();
  const file = formData.get("audio") as File | null;
  if (!file) return NextResponse.json({ error: "No audio file" }, { status: 400 });

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const transcript = await transcribeAudio(buffer, file.type);
    return NextResponse.json({ transcript });
  } catch (e) {
    console.error("Transcribe error:", e);
    return NextResponse.json({ error: "Không thể chuyển giọng nói thành văn bản" }, { status: 500 });
  }
}
