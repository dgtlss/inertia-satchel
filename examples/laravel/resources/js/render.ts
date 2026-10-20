import { createSSRApp, h } from 'vue';
import { renderToString } from '@vue/server-renderer';
import { createInertiaApp } from '@inertiajs/vue3';
import type { Page } from '@inertiajs/core';
import { resolve } from './resolve';

export const renderPage = (page: Page) => createInertiaApp({
  page,
  render: renderToString,
  resolve,
  setup: ({ App, props, plugin }) => createSSRApp({ render: () => h(App, props) }).use(plugin),
});
