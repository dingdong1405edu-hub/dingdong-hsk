# Audio assets

Listening-test audio files referenced by `ListeningTest.audioUrl` (e.g.
`/audio/hsk1-greeting.mp3`) are served from this folder at `/zh/audio/...`.

Drop the `.mp3` files here (filenames must match the `audioUrl` stored in the
database), or store fully-qualified URLs (e.g. Cloudflare R2) in `audioUrl`.
When a file is missing the player shows a graceful fallback and the test's
questions + transcript still work.
