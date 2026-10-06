"use client";
import { useFormStatus } from "react-dom";
import { ArrowUpRight, LoaderCircle } from "lucide-react";
export function SubmitButton({
  children,
  secondary = false,
}: {
  children: React.ReactNode;
  secondary?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className={`button ${secondary ? "button-secondary" : "button-primary"}`}
      disabled={pending}
    >
      {pending && <LoaderCircle size={16} className="spin" />}
      {pending ? "Salvando..." : children}
    </button>
  );
}
export function LaunchButton({
  disabled,
  label,
  pendingLabel = "Abrindo...",
}: {
  disabled: boolean;
  label: string;
  pendingLabel?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button className="launch-button" disabled={disabled || pending}>
      {pending ? pendingLabel : label}
      {pending ? <LoaderCircle className="spin" size={17} /> : <ArrowUpRight size={17} />}
    </button>
  );
}
