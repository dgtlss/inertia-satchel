import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import vue from '@vitejs/plugin-vue';
import tailwindcss from '@tailwindcss/vite';
import satchel from 'vite-plugin-satchel';

export default defineConfig({
  plugins: [
    laravel({ input: ['resources/css/app.css', 'resources/js/app.ts'] }),
    vue(),
    tailwindcss(),
    satchel(),
  ],
});
