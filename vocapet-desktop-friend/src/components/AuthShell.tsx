import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { Pet } from "./Pet";

interface AuthShellProps {
  title: string;
  subtitle: string;
  children: ReactNode;
}

export function AuthShell({ title, subtitle, children }: AuthShellProps) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-10">
      {/* playful background blobs */}
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-primary/15 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-secondary/15 blur-2xl" />

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="flex flex-col items-center text-center">
          <Pet />
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-foreground">{title}</h1>
          <p className="mt-1 text-sm font-semibold text-muted-foreground">{subtitle}</p>
        </div>

        <div className="mt-6 rounded-3xl border-2 border-border bg-card p-6 shadow-sm sm:p-8">
          {children}
        </div>

        <p className="mt-6 text-center text-xs font-semibold text-muted-foreground">
          VocaPet · learn vocabulary with your AI buddy 🐾
        </p>
      </motion.div>
    </div>
  );
}
