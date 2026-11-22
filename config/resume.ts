import { cv, cvToText } from "./cv";

/**
 * Texto do currículo que está sendo enviado hoje, gerado de `cv.ts` (o mesmo da página
 * /curriculo). O detector de palavras-chave compara a vaga com este texto para separar
 * "você tem e não escreveu" de "você não tem". Os rascunhos não usam este texto: só `profile.facts`.
 */
export const RESUME_TEXT = cvToText(cv);
