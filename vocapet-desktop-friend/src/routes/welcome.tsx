import { createFileRoute, redirect } from "@tanstack/react-router";
import { WelcomeFlow } from "@/components/ref/WelcomeFlow";
import { isAuthenticated } from "@/lib/auth";
import { getMeApi } from "@/api/user.api";

export const Route = createFileRoute("/welcome")({
  beforeLoad: async () => {
    if (!isAuthenticated()) {
      throw redirect({
        to: "/login",
      });
    }

    const me = await getMeApi();

    if (me.onboarded) {
      throw redirect({
        to: "/app",
      });
    }
  },

  component: Welcome,
});

function Welcome() {
  return <WelcomeFlow />;
}
