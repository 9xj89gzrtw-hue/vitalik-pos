import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* typescript: строгая проверка типов включена на сборке (0 ошибок) */
  reactStrictMode: false,
};

export default nextConfig;
