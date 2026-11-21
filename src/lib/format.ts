import type { Currency } from "@/domain/job";

export function formatSalary(
  min: number | null,
  max: number | null,
  currency: Currency | null,
): string | null {
  if (min === null || currency === null) return null;
  const format = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  });
  return max !== null && max !== min
    ? `${format.format(min)} – ${format.format(max)}`
    : format.format(min);
}
