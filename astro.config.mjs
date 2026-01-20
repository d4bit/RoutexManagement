// @ts-check
import { defineConfig } from 'astro/config';
import db from '@astrojs/db';
import tailwindcss from '@tailwindcss/vite';

import vercel from '@astrojs/vercel';

// https://astro.build/config
export default defineConfig({
  // 1. Integraciones de Astro
  integrations: [db()],

  // 2. Configuración de Vite (aquí vive Tailwind v4 y la optimización)
  vite: {
    plugins: [tailwindcss()],
    ssr: {
      // Esto evita el error de "Unknown file extension .astro" 
      // y ayuda a que los iconos carguen correctamente en el servidor
      noExternal: ['@lucide/astro'],
    },
    optimizeDeps: {
      // Esto acelera el arranque en desarrollo al pre-procesar la librería de iconos
      include: ['@lucide/astro']
    }
  },

  // 3. Opcional: Prefetching para que la navegación sea aún más rápida
  prefetch: {
    prefetchAll: true, // Precarga las páginas cuando pasas el ratón por el menú
    defaultStrategy: 'hover'
  },

  adapter: vercel()
});