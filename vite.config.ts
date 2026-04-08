import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { readFileSync } from "node:fs";

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;
const packageJson = JSON.parse(
  readFileSync(new URL("./package.json", import.meta.url), "utf-8"),
) as { version?: string };
const appVersion = packageJson.version ?? "0.0.0";

const baseCspDirectives = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "img-src 'self' data: blob: https://img.logo.dev",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
];

function buildCsp(connectSrc: string[]) {
  return [...baseCspDirectives, `connect-src ${connectSrc.join(" ")}`].join(
    "; ",
  );
}

const prodCsp = buildCsp([
  "'self'",
  "ipc:",
  "http://ipc.localhost",
  "https://*.supabase.co",
  "wss://*.supabase.co",
  "https://api.telegram.org",
]);

const devCsp = buildCsp([
  "'self'",
  "ipc:",
  "http://ipc.localhost",
  "https://*.supabase.co",
  "wss://*.supabase.co",
  "https://api.telegram.org",
  host ? `ws://${host}:1421` : "ws://localhost:1421",
]) + "; script-src 'self' 'unsafe-inline'";

// https://vite.dev/config/
export default defineConfig(async () => ({
  plugins: [react(), tailwindcss()],
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
  },

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  // Build optimizations
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Separate vendor chunks for better caching
          'vendor-charts': ['recharts'],
          'vendor-ui': [
            'framer-motion',
            '@radix-ui/react-checkbox',
            '@radix-ui/react-select',
            '@radix-ui/react-popover',
            '@radix-ui/react-separator',
            '@radix-ui/react-slot',
          ],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-utils': ['date-fns', 'clsx', 'tailwind-merge'],
        },
      },
    },
    chunkSizeWarningLimit: 600, // Increase limit for vendor chunks
  },

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    headers: {
      "Content-Security-Policy": devCsp,
    },
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
  preview: {
    headers: {
      "Content-Security-Policy": prodCsp,
    },
  },
}));
