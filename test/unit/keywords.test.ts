import { profile } from "@config/profile";
import { describe, expect, it } from "vitest";
import { profileTechnologies } from "@/domain/profile";
import { findTechnologies } from "@/domain/tech-catalog";
import { analyzeKeywords } from "@/scoring/keywords";

// Currículo controlado: o real (config/resume.ts) muda quando o usuário cola o CV dele.
const testProfile = { ...profile, resume: "Desenvolvedor React e TypeScript. Next.js." };

describe("catálogo de tecnologias", () => {
  it("respeita fronteiras: JavaScript não é Java, GitHub não é Git, Go-to-market não é Go", () => {
    expect(findTechnologies("JavaScript e GitHub Actions")).toEqual([
      "JavaScript",
      "GitHub Actions",
    ]);
    expect(findTechnologies("estratégia de Go-to-market")).toEqual([]);
    expect(findTechnologies("C#, ASP.NET Core e Golang")).toEqual(["C#", ".NET", "Go"]);
  });
});

describe("palavras-chave de ATS", () => {
  it("separa o que já está no CV, o que você tem e não escreveu e o que você não tem", () => {
    const report = analyzeKeywords(
      "Requisitos: React, TypeScript, Docker, NestJS, Vitest, GraphQL e Kubernetes",
      testProfile,
    );
    expect(report.inResume).toEqual(["React", "TypeScript"]);
    expect(report.hasNotWritten).toEqual(["NestJS", "Vitest", "Docker"]);
    expect(report.missing).toEqual(["GraphQL", "Kubernetes"]);
  });
});

describe("perfil verificado", () => {
  it("nenhum fato cita tecnologia marcada como sem experiência", () => {
    const known = profileTechnologies(profile);
    expect(profile.notExperienced.filter((tech) => known.has(tech))).toEqual([]);
  });

  it("os fatos cobrem a stack central do perfil", () => {
    const known = profileTechnologies(profile);
    for (const tech of [
      "React",
      "Next.js",
      "TypeScript",
      "Tailwind CSS",
      "NestJS",
      "AWS",
      "Vitest",
    ] as const) {
      expect(known.has(tech), tech).toBe(true);
    }
  });
});
