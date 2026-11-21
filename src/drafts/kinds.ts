/** Separado dos templates para o componente cliente não carregar o perfil e o catálogo. */
export const DRAFT_KINDS = ["resumo", "mensagem", "sobre"] as const;
export type DraftKind = (typeof DRAFT_KINDS)[number];

export const DRAFT_LABELS: Record<DraftKind, string> = {
  resumo: "Resumo para o topo do CV",
  mensagem: "Mensagem ao recrutador",
  sobre: 'Resposta "fale sobre você"',
};

export const MESSAGE_MAX_LENGTH = 300;
