import { JpText } from "@/components/tango/shared";

/** Pattern with its Vietnamese qualifier set apart: Japanese in the serif face, "（thời gian）" in the body face and a lighter colour. */
export function PatternTitle({ pattern, className = "" }: { pattern: string; className?: string }) {
  const m = pattern.match(/^(.*?)(（[^）]*）)(.*)$/);
  if (!m) return <JpText serif className={className}>{pattern}</JpText>;
  return (
    <span className={className}>
      <JpText serif>{m[1]}{m[3]}</JpText>
      <span className="ml-1 whitespace-nowrap font-sans text-[0.6em] font-semibold text-muted-foreground">{m[2]}</span>
    </span>
  );
}
