# Audio assets

Listening-test audio referenced by `ListeningTest.audioUrl`.

Three ways an audio URL ends up in the DB (set from **Admin → Bài nghe**):

1. **Upload a file** — drag/drop an `.mp3` (or `.wav/.ogg/.m4a`). Stored in
   Postgres (model `Upload`) → `audioUrl = /api/files/<id>`. You can then click
   **"Tạo transcript từ audio (Deepgram)"** to auto-fill the lời thoại.
2. **Generate from transcript** — paste the lời thoại and click
   "Tạo MP3 từ transcript (Google TTS)" (Mandarin cmn-CN voice). Stored the same way.
3. **Paste a URL** — e.g. a fully-qualified Cloudflare R2 link, used as-is.

> Deepgram & Groq do NOT have a Mandarin TTS voice — generating the MP3 uses
> **Google Cloud Text-to-Speech**; transcribing audio uses **Deepgram Nova-3**
> (with a Groq Whisper fallback).

Uploaded and generated audio is persisted in Postgres (model `Upload`) and
served via `/api/files/<id>`, so it survives Railway redeploys (the filesystem
there is ephemeral). This folder is just where externally-hosted clips may live.

**No audio? Still works.** When a test has no usable MP3, the learner player
falls back to the browser's Web Speech engine (zh-CN), reading the transcript
sentence by sentence (with A/B voice alternation for dialogues). The audio file
is therefore a quality upgrade, not a hard requirement.
