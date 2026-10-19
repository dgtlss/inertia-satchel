import { createRoot } from 'react-dom/client';
import type { ComponentType } from 'react';
import { createInertiaApp } from '@inertiajs/react';
import { resolveSatchel } from '@dgtlss/satchel';
import type { PageModule } from '@dgtlss/satchel';

const pages = import.meta.glob<PageModule<ComponentType>>(['./Pages/**/*.tsx', '!./Pages/vendor/**']);

void createInertiaApp({
  resolve: resolveSatchel<ComponentType>((name) => {
    const load = pages[`./Pages/${name}.tsx`];
    if (!load) throw new Error(`App page [${name}] was not found.`);
    return load();
  }),
  setup: ({ el, App, props }) => { createRoot(el).render(<App {...props} />); },
});
