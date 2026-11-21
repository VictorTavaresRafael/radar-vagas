import { MIN_PLAUSIBLE_SALARY } from "@/collectors/infer";
import type { Currency } from "@/domain/job";

export function formatSalary(
  min: number | null,
  max: number | null,
  currency: Currency | null,
): string | null {
  // Vagas gravadas antes do corte de cifras da empresa ainda têm "R$ 2" no banco.
  if (min === null || currency === null || min < MIN_PLAUSIBLE_SALARY) return null;
  const format = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  });
  return max !== null && max !== min
    ? `${format.format(min)} – ${format.format(max)}`
    : format.format(min);
}
