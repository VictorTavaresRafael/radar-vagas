import { normalizeForMatch } from "@/lib/text";

/**
 * Área da vaga pelo título. "fora" é vaga sem relação com tecnologia (vendas, atendimento,
 * jurídico, RH...), que sai da lista. Desenvolvimento, QA e dados ficam; sem pista, também.
 */
export type JobArea = "tecnologia" | "fora";

// Termo de tecnologia no título vence: "Customer Success Engineer" é vaga técnica.
const TECH =
  /\b(desenvolvedor[a]?|desenvolvimento|developer|dev|programador[a]?|software|engenh\w*|engineer\w*|front-?end|back-?end|full-?stack|mobile|ios|android|react|node|qa|quality assurance|tester|testes?|sdet|dados|data|analytics|bi|machine learning|ml|ia|ai|llm|devops|devsecops|sre|cloud|infra\w*|platform|plataforma|seguranca|security|cyber\w*|arquitet[oa]|architect\w*|tech|tecnologia|technology|technical|tecnico|sistemas|ti|dba|scrum|product owner|ux|ui|frameworks?)\b/;

const OUTSIDE =
  /\b(vendas?|comercial|sales|telesales|televendas|inside sales|account executive|executiv[oa]\(?a?\)? de contas|consultor\(?a?\)? comercial|business development|bdr|sdr|customer success|sucesso do cliente|atendimento|customer experience|experiencia do cliente|candidate experience|cx|juridic\w*|legal|advogad[oa]|contracts?|financeir[oa]|finance|fp&a|contab\w*|accounting|cobranca|credito|recursos humanos|rh|people|recruit\w*|recrutamento|talent acquisition|marketing|social media|comunicacao|assistente|assistant|administrativ[oa]|auxiliar|facilities|logistic[oa]|logistics|operacoes|operations|renewals|recepcionista|motoboy|entregador|strategy|estrategia|revenue|pricing|wealth|investimentos|planejamento|growth|compras|procurement|payroll|folha)\b/;

export function classifyArea(title: string): JobArea | null {
  const text = normalizeForMatch(title);
  if (TECH.test(text)) return "tecnologia";
  if (OUTSIDE.test(text)) return "fora";
  return null;
}
