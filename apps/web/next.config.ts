import type { NextConfig } from "next";

const apiUrl = process.env.API_URL ?? "http://127.0.0.1:3001";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/v1/flags/:path*",
        destination: `${apiUrl}/api/v1/flags/:path*`,
      },
    ];
  },
};

export default nextConfig;
