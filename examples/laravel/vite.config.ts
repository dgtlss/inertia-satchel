import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import vue from '@vitejs/plugin-vue';
import react from '@vitejs/plugin-react';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import tailwindcss from '@tailwindcss/vite';
import satchel from 'vite-plugin-satchel';
import devSsr from './vite/ssr';

export default defineConfig(({ isSsrBuild }) => {
  const framework = process.env.SATCHEL_FRAMEWORK ?? 'vue';
  const directory = { vue: 'js', react: 'react', svelte: 'svelte' }[framework];
  if (!directory) throw new Error('SATCHEL_FRAMEWORK must be vue, react, or svelte.');
  return {
    plugins: [
      laravel({
        input: ['resources/css/app.css', `resources/${directory}/app.${framework === 'react' ? 'tsx' : 'ts'}`],
        ssr: `resources/${directory}/ssr.ts`,
      }),
      framework === 'vue' ? vue() : framework === 'react' ? react() : svelte({ configFile: '../../svelte.config.js' }),
      tailwindcss(),
      satchel({ eager: isSsrBuild, dts: `resources/${directory}/satchel-pages.d.ts` }),
      ...(process.env.SATCHEL_DEV_SSR === 'true'
        ? [devSsr(`resources/${directory}/render.${framework === 'react' ? 'tsx' : 'ts'}`)] : []),
    ],
    ssr: { noExternal: ['@dgtlss/satchel', ...(framework === 'svelte' ? ['@inertiajs/svelte'] : [])] },
  };
});
