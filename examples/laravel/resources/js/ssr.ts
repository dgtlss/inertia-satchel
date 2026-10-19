import { createSSRApp, h } from 'vue';
import { renderToString } from '@vue/server-renderer';
import { createInertiaApp } from '@inertiajs/vue3';
import createServer from '@inertiajs/vue3/server';
import { resolve } from './resolve';

createServer((page) => createInertiaApp({
  page,
  render: renderToString,
  resolve,
  setup: ({ App, props, plugin }) => createSSRApp({ render: () => h(App, props) }).use(plugin),
}), { host: '127.0.0.1' });
