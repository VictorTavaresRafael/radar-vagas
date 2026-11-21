import { getDb } from "@/db";
import { listApplicationsForExport } from "@/db/repositories/applications";
import { applicationsToCsv, csvFileName } from "@/domain/applications-csv";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const csv = applicationsToCsv(await listApplicationsForExport(await getDb()));
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${csvFileName(new Date())}"`,
      "Cache-Control": "no-store",
    },
  });
}
