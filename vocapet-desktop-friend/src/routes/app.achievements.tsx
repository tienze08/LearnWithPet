import { createFileRoute, redirect } from "@tanstack/react-router";

// My Progress merged into /app/progress. Kept so old links keep working.
export const Route = createFileRoute("/app/achievements")({
  beforeLoad: () => {
    throw redirect({ to: "/app/progress" });
  },
});
