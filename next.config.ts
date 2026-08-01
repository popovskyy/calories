import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // iPhone / LAN: IP змінюється — тримай актуальний hostname з `npm run dev` (Network:)
  allowedDevOrigins: [
    "192.168.50.41",
    "192.168.50.40",
    "localhost",
    "127.0.0.1",
  ],
  serverExternalPackages: ["web-push"],
};

export default nextConfig;
