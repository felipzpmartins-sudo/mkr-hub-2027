import { forwardRef, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface RetroTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const RetroTextarea = forwardRef<HTMLTextAreaElement, RetroTextareaProps>(
  ({ label, error, className, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-xs font-medium text-muted-foreground tracking-wider uppercase mb-3">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          className={cn(
            "w-full bg-muted/50 border border-border",
            "px-4 py-3 text-foreground placeholder:text-muted-foreground/50",
            "focus:outline-none focus:border-foreground transition-colors duration-300",
            "text-base resize-none leading-relaxed",
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

RetroTextarea.displayName = "RetroTextarea";
