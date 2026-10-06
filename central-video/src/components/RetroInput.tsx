import { forwardRef, InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface RetroInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const RetroInput = forwardRef<HTMLInputElement, RetroInputProps>(
  ({ label, error, className, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-xs font-medium text-muted-foreground tracking-wider uppercase mb-3">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={cn(
            "w-full bg-transparent border-0 border-b border-border",
            "px-0 py-3 text-foreground placeholder:text-muted-foreground/50",
            "focus:outline-none focus:border-foreground transition-colors duration-300",
            "text-base",
            error && "border-destructive focus:border-destructive",
            className
          )}
          {...props}
        />
        {error && (
          <p className="mt-2 text-xs text-destructive">{error}</p>
        )}
      </div>
    );
  }
);

RetroInput.displayName = "RetroInput";
