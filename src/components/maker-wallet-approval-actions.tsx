"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Check, LoaderCircle, X } from "lucide-react";
import {
  approveMakerWalletAccess,
  rejectMakerWalletAccess,
} from "@/app/actions/maker-wallet-access";
import { FormFeedback } from "./form-fields";

function SubmitButton({
  danger = false,
  children,
}: {
  danger?: boolean;
  children: React.ReactNode;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className={`button button-small ${danger ? "button-danger" : "button-primary"}`}
      disabled={pending}
    >
      {pending && <LoaderCircle size={14} className="spin" />}
      {children}
    </button>
  );
}

export function MakerWalletApprovalActions({ accessId }: { accessId: string }) {
  const [approveState, approveAction] = useActionState(approveMakerWalletAccess, {});
  const [rejectState, rejectAction] = useActionState(rejectMakerWalletAccess, {});

  return (
    <div className="account-actions wallet-approval-actions">
      <form action={approveAction}>
        <input type="hidden" name="accessId" value={accessId} />
        <label className="compact-select">
          <span className="sr-only">Perfil no Maker Wallet</span>
          <select name="role" defaultValue="USER" aria-label="Perfil no Maker Wallet">
            <option value="USER">UsuÃ¡rio</option>
            <option value="ADMIN">Administrador</option>
          </select>
        </label>
        <SubmitButton>
          <Check size={14} /> Autorizar
        </SubmitButton>
      </form>
      <form
        action={rejectAction}
        onSubmit={(event) => {
          if (!window.confirm("Recusar esta solicitaÃ§Ã£o do Maker Wallet?"))
            event.preventDefault();
        }}
      >
        <input type="hidden" name="accessId" value={accessId} />
        <SubmitButton danger>
          <X size={14} /> Recusar
        </SubmitButton>
      </form>
      <FormFeedback
        state={approveState.error || approveState.success ? approveState : rejectState}
      />
    </div>
  );
}
