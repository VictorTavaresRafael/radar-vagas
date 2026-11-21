import type { FetchLike } from "@/collectors/types";
import { truncate } from "@/lib/text";

export interface AlertJob {
  readonly title: string;
  readonly company: string;
  readonly score: number;
  readonly url: string;
}

export interface Notifier {
  notify(jobs: readonly AlertJob[]): Promise<void>;
}

const MAX_JOBS_PER_MESSAGE = 10;
// O Telegram recusa mensagens acima de 4096 caracteres.
const TELEGRAM_LIMIT = 4000;

export function formatAlertMessage(jobs: readonly AlertJob[]): string {
  const lines = jobs
    .slice(0, MAX_JOBS_PER_MESSAGE)
    .map((job) => `• ${job.score} — ${job.title} (${job.company})\n${job.url}`);
  const extra =
    jobs.length > MAX_JOBS_PER_MESSAGE ? `\n… e mais ${jobs.length - MAX_JOBS_PER_MESSAGE}.` : "";
  const header = `Radar de Vagas: ${jobs.length} vaga${jobs.length === 1 ? "" : "s"} nova${jobs.length === 1 ? "" : "s"} com score alto`;
  return truncate(`${header}\n\n${lines.join("\n\n")}${extra}`, TELEGRAM_LIMIT);
}

export interface TelegramOptions {
  readonly botToken: string;
  readonly chatId: string;
  readonly fetch: FetchLike;
}

export function createTelegramNotifier(options: TelegramOptions): Notifier {
  return {
    async notify(jobs) {
      if (jobs.length === 0) return;
      const response = await options.fetch(
        `https://api.telegram.org/bot${options.botToken}/sendMessage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: options.chatId,
            text: formatAlertMessage(jobs),
            disable_web_page_preview: true,
          }),
        },
      );
      if (!response.ok) throw new Error(`Telegram respondeu HTTP ${response.status}`);
    },
  };
}
