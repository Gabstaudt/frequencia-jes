import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Upload da arte do certificado (até 4 MB; a Vercel aceita no máximo 4,5 MB por requisição).
    serverActions: { bodySizeLimit: "5mb" },
  },
};

export default nextConfig;
