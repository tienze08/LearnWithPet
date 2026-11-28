import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { KanjiMapPage, DEFAULT_KANJI } from "@/components/kanji-map/KanjiMapPage";

// Kanji module: explorer + mind map + detail panel on one page. The selected kanji lives in `?k=`.
export const Route = createFileRoute("/app/japanese/kanji")({
  validateSearch: (s: Record<string, unknown>): { k?: string } => ({
    k: typeof s.k === "string" && [...s.k].length === 1 ? s.k : undefined,
  }),
  component: KanjiRoute,
});

function KanjiRoute() {
  const { k } = Route.useSearch();
  const navigate = useNavigate();
  return (
    <KanjiMapPage
      char={k ?? DEFAULT_KANJI}
      onSelectKanji={(c) => navigate({ to: "/app/japanese/kanji", search: { k: c } })}
    />
  );
}
