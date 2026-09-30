"use client";
import { useActionState } from "react";
import { saveUser } from "@/app/actions/users";
import { Field, FormFeedback, SelectField } from "./form-fields";
import { SubmitButton } from "./submit-button";
type EditableUser = {
  id: string;
  name: string;
  email: string;
  department: string | null;
  jobTitle: string | null;
  hubRole: string;
  status: string;
};
export function UserForm({ user }: { user?: EditableUser }) {
  const [state, action] = useActionState(saveUser, {});
  return (
    <form action={action} className="panel form-panel">
      <div className="form-section-title">
        <h2>Dados do usuário</h2>
        <p>O papel no HUB é independente das permissões em cada sistema.</p>
      </div>
      <input type="hidden" name="id" value={user?.id || ""} />
      <div className="form-grid">
        <Field
          label="Nome completo"
          name="name"
          defaultValue={user?.name}
          required
          minLength={2}
          maxLength={100}
          autoComplete="name"
        />
        <Field
          label="E-mail corporativo"
          type="email"
          name="email"
          defaultValue={user?.email}
          required
          maxLength={254}
          autoComplete="email"
        />
        <Field
          label="Departamento"
          name="department"
          defaultValue={user?.department || ""}
          maxLength={120}
          placeholder="Ex.: Operações"
        />
        <Field
          label="Cargo"
          name="jobTitle"
          defaultValue={user?.jobTitle || ""}
          maxLength={120}
          placeholder="Ex.: Analista"
        />
        <SelectField name="hubRole" label="Papel no MKR HUB" defaultValue={user?.hubRole || "USER"}>
          <option value="USER">Colaborador</option>
          <option value="ADMIN">Administrador</option>
        </SelectField>
        <SelectField name="status" label="Status da conta" defaultValue={user?.status || "ACTIVE"}>
          <option value="ACTIVE">Ativo</option>
          <option value="INACTIVE">Inativo</option>
        </SelectField>
        <Field
          label={user ? "Redefinir senha (opcional)" : "Senha inicial"}
          type="password"
          name="password"
          autoComplete="new-password"
          required={!user}
          minLength={12}
          maxLength={72}
          hint={
            user
              ? "Deixe vazio para manter a senha atual. Mínimo de 12 caracteres."
              : "Mínimo de 12 caracteres. Compartilhe por um canal seguro."
          }
        />
      </div>
      <FormFeedback state={state} />
      <div className="form-footer">
        <p>
          {user
            ? "Alterações encerram as sessões anteriores deste usuário."
            : "O usuário será criado sem acesso aos sistemas."}
        </p>
        <SubmitButton>{user ? "Salvar alterações" : "Criar usuário"}</SubmitButton>
      </div>
    </form>
  );
}
