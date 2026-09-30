import { clsx, type ClassValue } from "clsx";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function todayLocalISO() {
  return format(new Date(), "yyyy-MM-dd");
}

export function parseDateOnly(date: string | null | undefined) {
  if (!date) return null;
  const [year, month, day] = date.slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

export function formatDateOnly(date: string | null | undefined, pattern = "dd/MM/yyyy") {
  const parsed = parseDateOnly(date);
  return parsed ? format(parsed, pattern, { locale: ptBR }) : "—";
}
