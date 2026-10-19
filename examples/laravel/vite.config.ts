import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import vue from '@vitejs/plugin-vue';
import react from '@vitejs/plugin-react';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import tailwindcss from '@tailwindcss/vite';
import satchel from 'vite-plugin-satchel';

export default defineConfig(({ isSsrBuild }) => {
  const framework = process.env.SATCHEL_FRAMEWORK ?? 'vue';
  const directory = { vue: 'js', react: 'react', svelte: 'svelte' }[framework];
  if (!directory) throw new Error('SATCHEL_FRAMEWORK must be vue, react, or svelte.');
  if (isSsrBuild && framework !== 'vue') throw new Error('This example verifies SSR with Vue only.');
  return {
    plugins: [
      laravel({
        input: ['resources/css/app.css', `resources/${directory}/app.${framework === 'react' ? 'tsx' : 'ts'}`],
        ssr: 'resources/js/ssr.ts',
      }),
      framework === 'vue' ? vue() : framework === 'react' ? react() : svelte({ configFile: '../../svelte.config.js' }),
      tailwindcss(),
      satchel({ eager: isSsrBuild, dts: `resources/${directory}/satchel-pages.d.ts` }),
    ],
    ssr: { noExternal: ['@dgtlss/satchel'] },
  };
});
