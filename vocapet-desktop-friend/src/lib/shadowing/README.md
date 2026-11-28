# Shadowing

## Recordings today

Local only. `MediaRecorder` produces a blob that stays in memory (`blob:` URL). It is revoked when the learner deletes
it, finishes the unit or leaves the page. The server receives counts, self-assessment answers and, if speech
recognition is on, a content-match percentage. No audio is uploaded, and there is no audio storage.

Limits (`src/lib/audio/recorder.ts`): 0.5 s minimum, 60 s per sentence, at most 180 s per continuous run, 20 MB.

## Speech recognition

Optional, off by default: the browser's Web Speech API. Many browsers send the audio to their vendor. It compares
words heard with the sentence; it is not a pronunciation score.

## Upload architecture (not built)

Needed before recordings are stored or sent to an assessment service (`src/lib/speech/assessment.ts`):

- `POST /api/japanese/shadowing/recordings` (multipart, authenticated). Check the content type by sniffing the bytes,
  cap size (20 MB) and duration (180 s) on the server, and rate-limit per user.
- Private object storage with random keys; the owner is stored in the database and checked on every read and delete.
  No public URLs; serve through the API or short-lived signed URLs.
- Explicit consent before the first upload, naming any third party that receives audio.
- Retention: delete after assessment unless the learner saves it; hard-delete saved ones after 30 days, on request,
  and with the account.
