"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { KeyRound, LoaderCircle, UserCheck, UserX } from "lucide-react";
import { manageCentralPurchasesAccount } from "@/app/actions/central-purchases-users";
import { FormFeedback } from "./form-fields";

function ActionButton({
  children,
  danger = false,
}: {
  children: React.ReactNode;
  danger?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className={`button button-small ${danger ? "button-danger" : "button-secondary"}`}
      disabled={pending}
    >
      {pending && <LoaderCircle size={14} className="spin" />}
      {children}
    </button>
  );
}

export function CentralPurchasesUserActions({ userId, active }: { userId: string; active: boolean }) {
  const [state, action] = useActionState(manageCentralPurchasesAccount, {});

  return (
    <div className="account-actions">
      <form
        action={action}
        onSubmit={(event) => {
          const message = active
            ? "Desativar este usuário no Central de Compras? A sessão dele deixará de funcionar."
            : "Reativar este usuário no Central de Compras?";
          if (!window.confirm(message)) event.preventDefault();
        }}
      >
        <input type="hidden" name="userId" value={userId} />
        <input type="hidden" name="action" value={active ? "deactivate" : "activate"} />
        <ActionButton danger={active}>
          {active ? <UserX size={14} /> : <UserCheck size={14} />}
          {active ? "Desativar" : "Ativar"}
        </ActionButton>
      </form>

      <details className="password-reset">
        <summary className="button button-secondary button-small">
          <KeyRound size={14} /> Resetar senha
        </summary>
        <form action={action} className="password-reset-form">
          <input type="hidden" name="userId" value={userId} />
          <input type="hidden" name="action" value="reset_password" />
          <label>
            <span>Nova senha</span>
            <input name="password" type="password" minLength={12} maxLength={72} required autoComplete="new-password" />
          </label>
          <label>
            <span>Confirmar senha</span>
            <input name="confirmation" type="password" minLength={12} maxLength={72} required autoComplete="new-password" />
          </label>
          <ActionButton>Salvar nova senha</ActionButton>
        </form>
      </details>

      <FormFeedback state={state} />
    </div>
  );
}
