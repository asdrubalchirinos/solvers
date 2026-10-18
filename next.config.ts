import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Sin cacheComponents: las páginas leen la sesión en el servidor
  // y se renderizan en cada request, más simple para este MVP.
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
