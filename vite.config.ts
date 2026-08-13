import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { readFileSync } from "node:fs";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // @ts-expect-error process is a nodejs global
  const host = process.env.TAURI_DEV_HOST;

  /*
    Tauri needs a fixed port, so this stays 1420 and `strictPort` stays on.
    But this repo is worked in git worktrees, and only one of them can hold
    1420 — a second worktree's dev server dies on startup with nothing to do
    about it. `PORT` lets that worktree move without touching the config.

    Unset (the Tauri path, and every normal `bun run dev`) it is exactly 1420,
    so this changes nothing for the default case. The HMR socket follows the
    same +1 offset the 1420/1421 pair already uses, and the dev CSP below is
    built from that value rather than a literal — otherwise a moved server
    would load fine and then have its HMR connection silently refused.
  */
  // @ts-expect-error process is a nodejs global
  const devPort = Number(process.env.PORT) || 1420;
  const hmrPort = devPort + 1;
  const packageJson = JSON.parse(
    readFileSync(new URL("./package.json", import.meta.url), "utf-8"),
  ) as { version?: string };
  const appVersion = packageJson.version ?? "0.0.0";

  const env = loadEnv(mode, process.cwd(), "");
  const supabaseOrigin = env.VITE_SUPABASE_URL
    ? new URL(env.VITE_SUPABASE_URL).origin
    : "https://bpgsfyallqqvvtjorybl.supabase.co";

  const baseCspDirectives = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    `img-src 'self' data: blob: ${supabaseOrigin}`,
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
    host ? `ws://${host}:${hmrPort}` : `ws://localhost:${hmrPort}`,
  ]) + "; script-src 'self' 'unsafe-inline'";

  return {
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
    port: devPort,
    strictPort: true,
    host: host || false,
    headers: {
      "Content-Security-Policy": devCsp,
    },
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: hmrPort,
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
  };
});
