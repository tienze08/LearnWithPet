import { createFileRoute, Link } from "@tanstack/react-router";
import { Practice } from "@/components/shadowing/Practice";
import { EmptyBlock, ErrorBlock, LoadingBlock } from "@/components/tango/shared";
import { GRAMMAR_LEVELS } from "@/data/japanese/grammar";
import { useShadowingUnitsQuery } from "@/hooks/queries/shadowing.queries";
import { MODES, type Mode } from "@/lib/shadowing/session";

export const Route = createFileRoute("/app/shadowing/$unitId")({
  validateSearch: (search: Record<string, unknown>): { mode?: Mode } => ({
    mode:
      typeof search.mode === "string" && search.mode in MODES ? (search.mode as Mode) : undefined,
  }),
  component: ShadowingUnit,
});

function ShadowingUnit() {
  const { unitId } = Route.useParams();
  const mode = Route.useSearch().mode ?? "REPEAT";
  const navigate = Route.useNavigate();
  // Unit ids start with their level: "n5-station".
  const level = GRAMMAR_LEVELS.find((l) => unitId.startsWith(`${l.toLowerCase()}-`)) ?? "N5";
  const units = useShadowingUnitsQuery(level);

  if (units.isPending) return <LoadingBlock rows={4} label="Đang tải bài shadowing" />;
  if (units.isError) return <ErrorBlock error={units.error} onRetry={() => units.refetch()} />;
  const unit = units.data.find((u) => u.id === unitId);
  if (!unit)
    return (
      <EmptyBlock title="Không tìm thấy bài shadowing">
        <Link to="/app/shadowing" className="studio-link">
          Về danh sách bài
        </Link>
      </EmptyBlock>
    );

  return (
    <Practice
      // Another unit or mode is another session.
      key={`${unitId}:${mode}`}
      unit={unit}
      units={units.data}
      mode={mode}
      onMode={(m) => navigate({ search: { mode: m }, replace: true })}
    />
  );
}
