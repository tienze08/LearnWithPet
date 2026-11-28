import { ReactNode } from "react";

interface ModeButtonProps {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  children: ReactNode;
}

/** One segment of the study-mode switch (the parent is a role="tablist" row). */
export default function ModeButton({ active, onClick, icon, children }: ModeButtonProps) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`flex min-h-11 shrink-0 items-center gap-2 border-b-2 px-3 text-sm transition-colors ${
        active
          ? "border-primary font-semibold text-foreground"
          : "border-transparent text-muted-foreground hover:text-foreground"
      }`}
    >
      <span aria-hidden className="[&_svg]:h-4 [&_svg]:w-4">
        {icon}
      </span>
      <span>{children}</span>
    </button>
  );
}
