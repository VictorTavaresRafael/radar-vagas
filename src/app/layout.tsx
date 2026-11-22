import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { NavLink } from "@/components/nav-link";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Radar de Vagas", template: "%s · Radar de Vagas" },
  description: "Vagas de tecnologia pontuadas e explicadas, sem candidatura automática.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen font-sans">
        <header className="sticky top-0 z-10 print:hidden border-b border-zinc-200 bg-white/85 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/85">
          <nav className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5">
            <Link href="/" className="mr-2 flex items-center gap-2 font-semibold tracking-tight">
              <span
                aria-hidden
                className="relative inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600"
              >
                <span className="h-2 w-2 rounded-full bg-white" />
                <span className="absolute inset-0 rounded-full ring-2 ring-emerald-600/30 ring-offset-2 ring-offset-white dark:ring-offset-zinc-900" />
              </span>
              Radar de Vagas
            </Link>
            <div className="flex items-center gap-1">
              <NavLink href="/">Vagas</NavLink>
              <NavLink href="/candidaturas">Candidaturas</NavLink>
              <NavLink href="/metricas">Métricas</NavLink>
              <NavLink href="/curriculo">Currículo</NavLink>
            </div>
          </nav>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6 print:max-w-none print:p-0">{children}</main>
        <footer className="mx-auto max-w-6xl px-4 pb-8 text-xs text-zinc-500 print:hidden">
          Candidatura sempre manual, pelo link original da vaga.
        </footer>
      </body>
    </html>
  );
}
