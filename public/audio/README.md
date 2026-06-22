# Audio assets

Listening-test audio referenced by `ListeningTest.audioUrl`.

Three ways an audio URL ends up in the DB (set from **Admin → Bài nghe**):

1. **Upload a file** — drag/drop an `.mp3` (or `.wav/.ogg/.m4a`). Saved to
   `public/audio/uploads/<uuid>.mp3` → `audioUrl = /audio/uploads/<uuid>.mp3`.
2. **Generate from transcript** — paste the lời thoại and click
   "Tạo MP3 từ transcript (Voxtral)". Saved to `public/audio/generated/<uuid>.mp3`.
3. **Paste a URL** — e.g. a fully-qualified Cloudflare R2 link, used as-is.

`uploads/` and `generated/` are git-ignored and written at runtime.

**No audio? Still works.** When a test has no usable MP3, the learner player
falls back to the browser's Web Speech engine (zh-CN), reading the transcript
sentence by sentence (with A/B voice alternation for dialogues). The audio file
is therefore a quality upgrade, not a hard requirement.

> NOTE (deploy): on an ephemeral filesystem (Railway without a mounted volume)
> these files do not survive a redeploy. Mount a volume at `/app/public/audio`
> or store fully-qualified R2 URLs in `audioUrl` for durability.
