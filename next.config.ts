import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // iPhone / LAN доступ до npm run dev (кнопки, HMR, RSC)
  allowedDevOrigins: ["192.168.50.40", "localhost", "127.0.0.1"],
  serverExternalPackages: ["web-push"],
};

export default nextConfig;
