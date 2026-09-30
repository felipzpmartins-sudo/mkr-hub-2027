"use client";
import Link from "next/link";
import { useActionState } from "react";
import { changePassword } from "@/app/actions/users";
import { Field, FormFeedback } from "./form-fields";
import { SubmitButton } from "./submit-button";
export function PasswordForm() {
  const [state, action] = useActionState(changePassword, {});
  return (
    <form action={action} className="panel form-panel">
      <div className="form-section-title">
        <h2>Segurança da conta</h2>
        <p>Use uma senha exclusiva, com no mínimo 12 caracteres.</p>
      </div>
      <div className="form-grid">
        <div className="span-2">
          <Field
            label="Senha atual"
            type="password"
            name="currentPassword"
            autoComplete="current-password"
            required
            maxLength={72}
          />
        </div>
        <Field
          label="Nova senha"
          type="password"
          name="password"
          autoComplete="new-password"
          required
          minLength={12}
          maxLength={72}
        />
        <Field
          label="Confirmar nova senha"
          type="password"
          name="confirmation"
          autoComplete="new-password"
          required
          minLength={12}
          maxLength={72}
        />
      </div>
      <FormFeedback state={state} />
      <div className="form-footer">
        <p>A alteração encerra todas as sessões da sua conta.</p>
        {state.success ? (
          <Link className="button button-primary" href="/login">
            Entrar novamente
          </Link>
        ) : (
          <SubmitButton>Alterar senha</SubmitButton>
        )}
      </div>
    </form>
  );
}
