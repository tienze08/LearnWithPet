import { createFileRoute, redirect } from "@tanstack/react-router";
import { getPathStatus } from "@/api/learning-path.api";
import { TodayView } from "@/components/learning-path/TodayView";

/**
 * Home. Every way into /app lands here (login, reopening with a saved token, the logo, the nav):
 * Learning Path on → Today (or setup until a plan exists); off → the progress dashboard.
 */
export const Route = createFileRoute("/app/")({
  beforeLoad: async ({ context }) => {
    // fetchQuery (not ensureQueryData): after saving a plan the cached status is invalidated and must be re-read.
    const status = await context.queryClient
      .fetchQuery({ queryKey: ["path", "status"], queryFn: getPathStatus, staleTime: 60_000 })
      .catch(() => null);
    if (!status?.enabled) throw redirect({ to: "/app/progress" });
    if (!status.onboarded) throw redirect({ to: "/app/path/setup" });
  },
  component: TodayView,
});
