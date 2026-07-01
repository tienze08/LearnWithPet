import { getMeApi } from "@/api/user.api";
import { AuthInput } from "@/components/AuthInput";
import { AuthShell } from "@/components/AuthShell";
import { SubmitButton } from "@/components/SubmitButton";
import { useLoginMutation } from "@/hooks/queries/auth.queries";
import { useAuthStore } from "@/hooks/stores/auth.store";
import { isAuthenticated } from "@/lib/auth";
import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

export const Route = createFileRoute("/login")({
  beforeLoad: () => {
    if (isAuthenticated()) {
      throw redirect({
        to: "/app",
      });
    }
  },

  component: LoginPage,
});

const schema = z.object({
  email: z.string().trim().min(1, "Email is required").email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type Errors = Partial<Record<"email" | "password", string>>;

function LoginPage() {
  const loginMutation = useLoginMutation();

  const authStore = useAuthStore();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState<Errors>({});
  const [loading, setLoading] = useState(false);

  const update = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      const fieldErrors: Errors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof Errors;
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);
    try {
      console.log("submit");
      const res = await loginMutation.mutateAsync(parsed.data);
      console.log(res);

      authStore.login(res.token, res.name);

      localStorage.setItem("vocapet_token", res.token);
      localStorage.setItem("vocapet_name", res.name);

      const me = await getMeApi();

      if (!me.onboarded) {
        navigate({
          to: "/welcome",
        });
      } else {
        toast.success("Login successful");
        navigate({
          to: "/app",
        });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell title="Welcome back!" subtitle="Your pet missed you. Let's keep the streak going!">
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <AuthInput
          label="Email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          value={form.email}
          onChange={update("email")}
          error={errors.email}
        />
        <AuthInput
          label="Password"
          type="password"
          placeholder="••••••••"
          autoComplete="current-password"
          value={form.password}
          onChange={update("password")}
          error={errors.password}
        />
        <SubmitButton loading={loading}>Login</SubmitButton>
      </form>

      <p className="mt-5 text-center text-sm font-semibold text-muted-foreground">
        Don't have an account?{" "}
        <Link to="/register" className="font-extrabold text-primary hover:underline">
          Register
        </Link>
      </p>
    </AuthShell>
  );
}
