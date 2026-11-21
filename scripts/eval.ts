import { profile } from "@config/profile";
import { checkGates, type EvalGates, formatReport } from "@/eval/report";
import { runEval } from "@/eval/run";
import { evalCases } from "../eval/cases";

/** Mínimos que o CI exige. Suba-os quando o score melhorar; nunca baixe para passar. */
const gates: EvalGates = {
  eliminationPrecision: 0.9,
  eliminationRecall: 0.9,
  relevanceF1: 0.8,
};

const report = await runEval(evalCases, {
  profile,
  salaryFloorBrl: 6000,
  llmWeight: 0,
  now: new Date("2026-11-20T12:00:00Z"),
});
console.log(formatReport(report));

const failed = checkGates(report, gates);
if (failed.length > 0) {
  console.error(`\nEval reprovado:\n- ${failed.join("\n- ")}`);
  process.exitCode = 1;
}
