import { describe, expect, it } from "vitest";
import { followUpState, overdueItems } from "@/domain/followup";

// 21/11/2026 às 10:00 em Brasília.
const now = new Date("2026-11-21T13:00:00Z");

describe("follow-up", () => {
  it("classifica pelo dia no calendário de Brasília", () => {
    expect(followUpState("candidatado", new Date("2026-11-20T12:00:00-03:00"), now)).toBe(
      "atrasado",
    );
    expect(followUpState("candidatado", new Date("2026-11-21T08:00:00-03:00"), now)).toBe("hoje");
    expect(followUpState("entrevista", new Date("2026-11-21T23:30:00-03:00"), now)).toBe("hoje");
    expect(followUpState("entrevista", new Date("2026-11-22T00:10:00-03:00"), now)).toBe(
      "agendado",
    );
  });

  it("usa o fuso de Brasília na virada do dia em UTC", () => {
    // 02:00 UTC do dia 22 ainda é 23:00 do dia 21 em Brasília.
    const lateNight = new Date("2026-11-22T02:00:00Z");
    expect(followUpState("candidatado", new Date("2026-11-21T12:00:00-03:00"), lateNight)).toBe(
      "hoje",
    );
  });

  it("ignora quem não tem data ou já teve resposta", () => {
    const yesterday = new Date("2026-11-20T12:00:00-03:00");
    expect(followUpState("candidatado", null, now)).toBeNull();
    expect(followUpState("oferta", yesterday, now)).toBeNull();
    expect(followUpState("recusado", yesterday, now)).toBeNull();
    expect(followUpState("interessante", yesterday, now)).toBeNull();
  });

  it("lista as atrasadas da mais antiga para a mais recente", () => {
    const items = [
      { id: "a", status: "candidatado" as const, nextStepAt: new Date("2026-11-19T12:00:00Z") },
      { id: "b", status: "entrevista" as const, nextStepAt: new Date("2026-11-10T12:00:00Z") },
      { id: "c", status: "oferta" as const, nextStepAt: new Date("2026-11-01T12:00:00Z") },
      { id: "d", status: "candidatado" as const, nextStepAt: new Date("2026-11-25T12:00:00Z") },
    ];
    expect(overdueItems(items, now).map((item) => item.id)).toEqual(["b", "a"]);
  });
});
