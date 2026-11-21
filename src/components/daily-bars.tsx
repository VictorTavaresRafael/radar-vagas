import type { DayCount } from "@/domain/metrics";

const WIDTH = 720;
const HEIGHT = 160;
const GAP = 2;

function label(day: string): string {
  const [, month, date] = day.split("-");
  return `${date}/${month}`;
}

/** Barras simples em SVG, renderizadas no servidor. Hover pelo <title> nativo de cada barra. */
export function DailyBars({ data }: { data: readonly DayCount[] }) {
  const max = Math.max(1, ...data.map((entry) => entry.count));
  const slot = WIDTH / Math.max(1, data.length);
  const first = data[0];
  const last = data.at(-1);
  return (
    <figure className="space-y-2">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT + 18}`}
        className="w-full text-emerald-600 dark:text-emerald-400"
        role="img"
        aria-label="Vagas novas por dia"
      >
        <line
          x1={0}
          x2={WIDTH}
          y1={HEIGHT}
          y2={HEIGHT}
          className="stroke-zinc-300 dark:stroke-zinc-700"
        />
        {data.map((entry, index) => {
          const height = (entry.count / max) * (HEIGHT - 8);
          return (
            <g key={entry.day}>
              <title>{`${label(entry.day)}: ${entry.count} vaga(s)`}</title>
              {/* Área de hover da coluna inteira, maior que a barra. */}
              <rect x={index * slot} y={0} width={slot} height={HEIGHT} fill="transparent" />
              {entry.count > 0 && (
                <rect
                  x={index * slot + GAP / 2}
                  y={HEIGHT - height}
                  width={Math.max(1, slot - GAP)}
                  height={height}
                  rx={Math.min(4, (slot - GAP) / 2)}
                  fill="currentColor"
                />
              )}
            </g>
          );
        })}
        {first && (
          <text x={0} y={HEIGHT + 14} className="fill-zinc-500 text-[11px]">
            {label(first.day)}
          </text>
        )}
        {last && (
          <text x={WIDTH} y={HEIGHT + 14} textAnchor="end" className="fill-zinc-500 text-[11px]">
            {label(last.day)}
          </text>
        )}
        <text x={0} y={10} className="fill-zinc-500 text-[11px]">
          máx. {max}
        </text>
      </svg>
      <details className="text-sm">
        <summary className="cursor-pointer text-zinc-600 dark:text-zinc-400">Ver tabela</summary>
        <table className="mt-2 w-full max-w-xs text-left tabular-nums">
          <thead>
            <tr className="text-zinc-500">
              <th className="font-medium">Dia</th>
              <th className="text-right font-medium">Vagas</th>
            </tr>
          </thead>
          <tbody>
            {data.map((entry) => (
              <tr key={entry.day}>
                <td>{label(entry.day)}</td>
                <td className="text-right">{entry.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
