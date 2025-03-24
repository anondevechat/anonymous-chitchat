import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": new URL('./src/', import.meta.url).pathname,
    },
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('src/components/ui')) {
            return 'ui-components';
          }
          if (id.includes('src/components')) {
            return 'components';
          }
          if (id.includes('src/lib')) {
            return 'lib';
          }
          if (id.includes('src/hooks')) {
            return 'hooks';
          }
          return 'index';
        },
      },
    },
  },
}));
