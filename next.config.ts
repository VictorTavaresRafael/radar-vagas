import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PGlite carrega um binário WASM em tempo de execução; empacotá-lo quebra o carregamento.
  serverExternalPackages: ["@electric-sql/pglite"],
  typedRoutes: true,
};

export default nextConfig;
