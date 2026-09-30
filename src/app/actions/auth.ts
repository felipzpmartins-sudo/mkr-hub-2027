"use server";
import { AuthError } from "next-auth";
import { signIn, signOut } from "@/auth";
import type { FormState } from "@/types/forms";

export async function loginAction(_: FormState, form: FormData): Promise<FormState> {
  try {
    await signIn("credentials", {
      email: form.get("email"),
      password: form.get("password"),
      redirectTo: "/dashboard",
    });
  } catch (error) {
    if (error instanceof AuthError)
      return {
        error:
          "Não foi possível entrar. Confira suas credenciais ou tente novamente em 15 minutos.",
      };
    throw error;
  }
  return {};
}
export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}
