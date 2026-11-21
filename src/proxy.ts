import { type NextRequest, NextResponse } from "next/server";

/**
 * Senha única opcional para quando o painel for publicado. Sem DASHBOARD_PASSWORD
 * (uso local), passa direto; na Vercel, a senha é obrigatória. Qualquer usuário serve; só a senha é conferida.
 */
export function proxy(request: NextRequest): NextResponse {
  const password = process.env.DASHBOARD_PASSWORD;
  // Publicado sem senha, falha fechado em vez de deixar o painel aberto.
  if (!password && process.env.VERCEL) {
    return new NextResponse("Defina DASHBOARD_PASSWORD para publicar o painel.", { status: 503 });
  }
  if (!password) return NextResponse.next();
  if (hasValidCredentials(request.headers.get("authorization"), password))
    return NextResponse.next();
  return new NextResponse("Autenticação necessária.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Radar de Vagas", charset="UTF-8"' },
  });
}

export function hasValidCredentials(header: string | null, password: string): boolean {
  if (!header?.startsWith("Basic ")) return false;
  const decoded = Buffer.from(header.slice("Basic ".length), "base64").toString("utf8");
  const supplied = decoded.slice(decoded.indexOf(":") + 1);
  return constantTimeEqual(supplied, password);
}

// Comparação em tempo constante para não vazar, pelo tempo de resposta, quantos caracteres acertaram.
function constantTimeEqual(a: string, b: string): boolean {
  const length = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let index = 0; index < length; index += 1) {
    diff |= (a.charCodeAt(index) || 0) ^ (b.charCodeAt(index) || 0);
  }
  return diff === 0;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
