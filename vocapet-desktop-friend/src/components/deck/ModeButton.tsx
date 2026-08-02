import { ReactNode } from "react";

interface ModeButtonProps {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  children: ReactNode;
}

export default function ModeButton({ active, onClick, icon, children }: ModeButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 rounded-xl border-2 px-4 py-2 text-sm font-bold transition-colors ${
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card hover:border-primary"
      }`}
    >
      {icon}
      <span>{children}</span>
    </button>
  );
}
