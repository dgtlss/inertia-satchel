import { createApp, h } from 'vue';
import type { DefineComponent } from 'vue';
import { createInertiaApp } from '@inertiajs/vue3';
import { resolveSatchel } from '@dgtlss/satchel';
import type { PageModule } from '@dgtlss/satchel';

const appPages = import.meta.glob<PageModule<DefineComponent>>('./Pages/**/*.vue');

void createInertiaApp({
  resolve: resolveSatchel<DefineComponent>((name) => {
    const load = appPages[`./Pages/${name}.vue`];
    if (!load) throw new Error(`App page [${name}] was not found.`);
    return load();
  }),
  setup({ el, App, props, plugin }) {
    createApp({ render: () => h(App, props) }).use(plugin).mount(el);
  },
});
