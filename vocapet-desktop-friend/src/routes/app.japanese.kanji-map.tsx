import { createFileRoute, redirect } from "@tanstack/react-router";

// Old prototype URL: the map now lives on the Kanji page. Kept so existing links keep working.
export const Route = createFileRoute("/app/japanese/kanji-map")({
  validateSearch: (s: Record<string, unknown>): { k?: string } => ({ k: typeof s.k === "string" ? s.k : undefined }),
  beforeLoad: ({ search }) => {
    throw redirect({ to: "/app/japanese/kanji", search: { k: search.k } });
  },
});
