"use client";
import { useActionState } from "react";
import { saveSystem } from "@/app/actions/systems";
import { Field, FormFeedback, SelectField } from "./form-fields";
import { SubmitButton } from "./submit-button";
type EditableSystem = {
  id: string;
  name: string;
  slug: string;
  description: string;
  url: string | null;
  status: string;
  icon: string;
};
export function SystemForm({ system }: { system?: EditableSystem }) {
  const [state, action] = useActionState(saveSystem, {});
  return (
    <form action={action} className="panel form-panel">
      <input type="hidden" name="id" value={system?.id || ""} />
      <div className="form-section-title">
        <h2>Informações do sistema</h2>
        <p>Defina o endereço e a disponibilidade no workspace.</p>
      </div>
      <div className="form-grid">
        <Field
          label="Nome"
          name="name"
          defaultValue={system?.name}
          required
          minLength={2}
          maxLength={80}
        />
        <Field
          label="Identificador"
          name="slug"
          defaultValue={system?.slug}
          required
          pattern="[a-z0-9]+(-[a-z0-9]+)*"
          maxLength={80}
          hint="Letras minúsculas, números e hífens."
        />
        <div className="span-2">
          <Field
            label="Descrição"
            name="description"
            defaultValue={system?.description}
            required
            minLength={5}
            maxLength={240}
          />
        </div>
        <div className="span-2">
          <Field
            label="URL de acesso"
            name="url"
            type="url"
            defaultValue={system?.url || ""}
            placeholder="https://seu-sistema.exemplo.com"
            maxLength={2048}
            hint="HTTPS, sem credenciais ou parâmetros na URL. Obrigatória para colocar o sistema online."
          />
        </div>
        <SelectField label="Status" name="status" defaultValue={system?.status || "OFFLINE"}>
          <option value="ONLINE">Online</option>
          <option value="MAINTENANCE">Manutenção</option>
          <option value="OFFLINE">Offline</option>
        </SelectField>
        <SelectField label="Ícone" name="icon" defaultValue={system?.icon || "grid"}>
          <option value="grid">Aplicação</option>
          <option value="shopping">Compras</option>
          <option value="megaphone">Marketing</option>
          <option value="car">Veículos</option>
          <option value="video">Vídeos</option>
          <option value="shield">Segurança</option>
        </SelectField>
      </div>
      <FormFeedback state={state} />
      <div className="form-footer">
        <p>O status é definido manualmente pelo administrador.</p>
        <SubmitButton>{system ? "Salvar alterações" : "Criar sistema"}</SubmitButton>
      </div>
    </form>
  );
}
