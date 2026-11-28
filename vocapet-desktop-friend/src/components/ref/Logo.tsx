import { Cat } from "./Cat";
import tealLogo from "@/assets/cat/logo-teal.png";

/**
 * Wordmark from the reference: a small cat-face badge and the name in the display serif.
 * `teal` uses the reference's own teal cat badge (Welcome screen); the default keeps the in-app sidebar as it was.
 */
export function Logo({ className = "", teal = false }: { className?: string; teal?: boolean }) {
  return (
    <span className={`flex items-center gap-2.5 ${className}`}>
      {teal ? (
        <img src={tealLogo} alt="" aria-hidden draggable={false} className="h-10 w-auto shrink-0" />
      ) : (
        <span
          aria-hidden
          className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-xl bg-primary-soft"
        >
          <Cat pose="face" className="w-8" />
        </span>
      )}
      <span
        className={`studio-head tracking-tight ${teal ? "text-[1.35rem] font-medium" : "text-xl"}`}
      >
        VocaPet
      </span>
    </span>
  );
}
