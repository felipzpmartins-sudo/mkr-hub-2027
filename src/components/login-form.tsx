"use client";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { ArrowRight, Eye, EyeOff, LoaderCircle } from "lucide-react";
import { loginAction } from "@/app/actions/auth";
import { FormFeedback } from "./form-fields";
function LoginButton() {
  const { pending } = useFormStatus();
  return (
    <button className="button button-primary login-button" disabled={pending}>
      {pending ? "Entrando..." : "Entrar"}
      {pending ? <LoaderCircle size={18} className="spin" /> : <ArrowRight size={18} />}
    </button>
  );
}
export function LoginForm() {
  const [state, action] = useActionState(loginAction, {});
  const [visible, setVisible] = useState(false);
  return (
    <form action={action} className="login-form">
      <label className="field">
        <span>E-mail</span>
        <input
          type="email"
          name="email"
          autoComplete="username"
          placeholder="seu.nome@empresa.com"
          required
          maxLength={254}
        />
      </label>
      <label className="field">
        <span>Senha</span>
        <div className="password-input">
          <input
            type={visible ? "text" : "password"}
            name="password"
            autoComplete="current-password"
            placeholder="Digite sua senha"
            required
            maxLength={72}
          />
          <button
            type="button"
            className="icon-button"
            aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
            onClick={() => setVisible(!visible)}
          >
            {visible ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </label>
      <FormFeedback state={state} />
      <LoginButton />
    </form>
  );
}
