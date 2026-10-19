import { createInertiaApp } from '@inertiajs/svelte';
import type { Component } from 'svelte';
import { resolveSatchelModules } from '@dgtlss/satchel';
import type { PageModule } from '@dgtlss/satchel';

const pages = import.meta.glob<PageModule<Component>>(['./Pages/**/*.svelte', '!./Pages/vendor/**']);

void createInertiaApp({
  resolve: resolveSatchelModules<Component>((name) => {
    const load = pages[`./Pages/${name}.svelte`];
    if (!load) throw new Error(`App page [${name}] was not found.`);
    return load();
  }),
});
