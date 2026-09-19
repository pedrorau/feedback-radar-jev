import { defineConfig } from 'astro/config';
import node from '@astrojs/node';

// output: 'server' + adapter de Node hace que /src/pages/api/*.ts
// corran como endpoints de servidor. Ahí vive el proxy que le pega la
// API key a la llamada, así el navegador nunca la ve y no hay CORS.
export default defineConfig({
  output: 'server',
  adapter: node({ mode: 'standalone' }),
});
