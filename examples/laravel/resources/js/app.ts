import { createApp, createSSRApp, h } from 'vue';
import { createInertiaApp } from '@inertiajs/vue3';
import { resolve } from './resolve';

void createInertiaApp({
  resolve,
  setup({ el, App, props, plugin }) {
    const create = el.hasChildNodes() ? createSSRApp : createApp;
    create({ render: () => h(App, props) }).use(plugin).mount(el);
  },
});
