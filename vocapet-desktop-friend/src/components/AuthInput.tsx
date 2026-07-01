import { forwardRef, useId, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface AuthInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const AuthInput = forwardRef<HTMLInputElement, AuthInputProps>(
  ({ label, error, className, id, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    return (
      <div className="space-y-1.5">
        <label htmlFor={inputId} className="block text-sm font-bold text-foreground">
          {label}
        </label>
        <input
          ref={ref}
          id={inputId}
          aria-invalid={Boolean(error)}
          className={cn(
            "w-full rounded-2xl border-2 bg-muted/40 px-4 py-3 text-base font-semibold text-foreground outline-none transition-colors",
            "placeholder:font-medium placeholder:text-muted-foreground",
            "focus:border-primary focus:bg-card",
            error ? "border-destructive" : "border-border",
            className,
          )}
          {...props}
        />
        {error ? <p className="text-sm font-semibold text-destructive">{error}</p> : null}
      </div>
    );
  },
);

AuthInput.displayName = "AuthInput";
