import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  allowedDevOrigins: ['192.168.50.47', '192.168.8.88', '192.168.50.*', '192.168.8.*'],
};

export default nextConfig;
