function tone(score: number): string {
  if (score >= 80)
    return "bg-emerald-100 text-emerald-800 ring-emerald-600/20 dark:bg-emerald-500/15 dark:text-emerald-300";
  if (score >= 60)
    return "bg-amber-100 text-amber-800 ring-amber-600/20 dark:bg-amber-500/15 dark:text-amber-300";
  if (score > 0)
    return "bg-zinc-100 text-zinc-700 ring-zinc-500/20 dark:bg-zinc-800 dark:text-zinc-300";
  return "bg-rose-100 text-rose-800 ring-rose-600/20 dark:bg-rose-500/15 dark:text-rose-300";
}

export function ScoreBadge({ score, size = "md" }: { score: number; size?: "md" | "lg" }) {
  const dimensions = size === "lg" ? "h-14 w-14 text-xl" : "h-10 w-10 text-sm";
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold tabular-nums ring-1 ring-inset ${dimensions} ${tone(score)}`}
      title={score === 0 ? "Eliminada por filtro" : `Score ${score}/100`}
    >
      {score}
    </span>
  );
}
