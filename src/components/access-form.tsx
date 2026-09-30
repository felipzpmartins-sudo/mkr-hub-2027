"use client";
import { useActionState } from "react";
import { saveAccess } from "@/app/actions/users";
import { Field, FormFeedback, SelectField } from "./form-fields";
import { SubmitButton } from "./submit-button";
type Access = {
  enabled: boolean;
  role: string;
  externalUserId: string | null;
  externalUserEmail: string | null;
  externalDisplayName: string | null;
  externalProvider: string | null;
  externalIssuer: string | null;
  externalSubject: string | null;
  status: "ACTIVE" | "REVOKED";
  linkedAt: Date | null;
};
export function AccessForm({
  userId,
  system,
  access,
}: {
  userId: string;
  system: { id: string; name: string; slug: string };
  access?: Access;
}) {
  const [state, action] = useActionState(saveAccess, {});
  return (
    <form action={action} className="access-panel">
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="systemId" value={system.id} />
      <div className="access-heading">
        <h3>{system.name}</h3>
        <label className="switch-label">
          <input type="checkbox" name="enabled" defaultChecked={access?.enabled} />
          <span className="switch-track" />
          <span>Acesso habilitado</span>
        </label>
      </div>
      <div className="access-grid">
        <Field
          label="Perfil no sistema"
          name="role"
          defaultValue={access?.role || "USER"}
          required
          maxLength={80}
          placeholder="ADMIN, USER, EDITOR..."
        />
        <SelectField label="Status do vínculo" name="status" defaultValue={access?.status || "ACTIVE"}>
          <option value="ACTIVE">Ativo</option>
          <option value="REVOKED">Revogado</option>
        </SelectField>
        <Field
          label="E-mail da conta externa"
          name="externalUserEmail"
          type="email"
          defaultValue={access?.externalUserEmail || ""}
          maxLength={254}
          placeholder="Opcional"
        />
        <Field
          label="ID da conta externa"
          name="externalUserId"
          defaultValue={access?.externalUserId || ""}
          maxLength={200}
          placeholder={system.slug === "central-de-compras" ? "UUID de auth.users.id" : "Opcional"}
          hint={
            system.slug === "central-de-compras"
              ? "Use o UUID auth.users.id da Central de Compras. Não use profiles.id."
              : undefined
          }
        />
        <Field
          label="Nome na conta externa"
          name="externalDisplayName"
          defaultValue={access?.externalDisplayName || ""}
          maxLength={512}
          placeholder="Opcional, somente conferência"
        />
        <Field
          label="Provedor externo"
          name="externalProvider"
          defaultValue={access?.externalProvider || ""}
          maxLength={512}
          placeholder="Ex.: mkr_hub, keycloak"
        />
        <Field
          label="Issuer externo"
          name="externalIssuer"
          defaultValue={access?.externalIssuer || ""}
          maxLength={512}
          placeholder="Preparação futura para OIDC"
        />
        <Field
          label="Subject externo"
          name="externalSubject"
          defaultValue={access?.externalSubject || ""}
          maxLength={512}
          placeholder="Preparação futura para OIDC"
        />
      </div>
      {access?.linkedAt && (
        <p className="field-hint">Vínculo registrado em {access.linkedAt.toLocaleString("pt-BR")}.</p>
      )}
      <FormFeedback state={state} />
      <div className="access-footer">
        <span>O vínculo apenas registra a correspondência; ele não cria nem altera contas externas.</span>
        <SubmitButton secondary>Salvar permissão</SubmitButton>
      </div>
    </form>
  );
}
