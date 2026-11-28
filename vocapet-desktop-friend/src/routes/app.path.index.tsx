import { createFileRoute, redirect } from "@tanstack/react-router";

// Today now lives at /app. Kept so old links keep working.
export const Route = createFileRoute("/app/path/")({
  beforeLoad: () => {
    throw redirect({ to: "/app" });
  },
});
