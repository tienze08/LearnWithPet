import { createFileRoute, redirect } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { isAuthenticated } from "@/lib/auth";
import { getMeApi } from "@/api/user.api";

export const Route = createFileRoute("/app")({
  ssr: false,

  beforeLoad: async () => {
    if (!isAuthenticated()) {
      throw redirect({
        to: "/login",
      });
    }

    const me = await getMeApi();

    if (!me.onboarded) {
      throw redirect({
        to: "/welcome",
      });
    }
  },

  component: AppShell,
});
