# Listening content

- `n5.json` — lessons. A line is either `ref` (a Sentence Bank id, `<grammarId>:<index>`) or its own `ja` / `furigana` / `vi`.
  Lines written here are VocaPet drafts (`"status": "draft"`) and need review by a Japanese speaker.
- `audio.json` — recordings. **Empty: there are no audio files yet**, so the app uses the browser's Japanese voice and
  labels it as synthesized.

## Adding a recording

Put the file under `vocapet-desktop-friend/public/audio/` and list it with its real length, source and licence.
Only add audio you are allowed to use.

```json
{
  "sentences": {
    "koko-soko-asoko-doko:2": { "src": "/audio/doko-2.mp3", "durationSeconds": 2.4, "source": "…", "license": "…" },
    "n5-station:1": { "src": "/audio/station-1.mp3", "durationSeconds": 2.1, "source": "…", "license": "…" }
  },
  "dialogues": {
    "n5-station": {
      "src": "/audio/station.mp3", "durationSeconds": 18, "source": "…", "license": "…",
      "cues": [[0, 2.4], [2.9, 5.0]]
    }
  }
}
```

A dialogue file needs one cue per line and wins over per-sentence files.

Check content and manifest: `npx tsx --tsconfig tsconfig.json tools/listeningCheck.ts`
