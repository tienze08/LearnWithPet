import { AuthInput } from "@/components/AuthInput";
import { AuthShell } from "@/components/AuthShell";
import { SubmitButton } from "@/components/SubmitButton";
import { useRegisterMutation } from "@/hooks/queries/auth.queries";
import { isAuthenticated } from "@/lib/auth";
import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

export const Route = createFileRoute("/register")({
  beforeLoad: () => {
    if (isAuthenticated()) {
      throw redirect({
        to: "/app",
      });
    }
  },

  component: RegisterPage,
});

const schema = z.object({
  name: z.string().trim().min(1, "Please enter your name"),
  email: z.string().trim().min(1, "Email is required").email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type Errors = Partial<Record<"name" | "email" | "password", string>>;

function RegisterPage() {
  const navigate = useNavigate();
  const registerMutation = useRegisterMutation();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
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
      const res = await registerMutation.mutateAsync(parsed.data);

      toast.success(res.message);

      navigate({
        to: "/login",
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="Your pet can't wait to start learning with you!"
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <AuthInput
          label="Name"
          placeholder="Alex"
          autoComplete="name"
          value={form.name}
          onChange={update("name")}
          error={errors.name}
        />
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
          autoComplete="new-password"
          value={form.password}
          onChange={update("password")}
          error={errors.password}
        />
        <SubmitButton loading={loading}>Create Account</SubmitButton>
      </form>

      <p className="mt-5 text-center text-sm font-semibold text-muted-foreground">
        Already have an account?{" "}
        <Link to="/login" className="font-extrabold text-primary hover:underline">
          Login
        </Link>
      </p>
    </AuthShell>
  );
}
