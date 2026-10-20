import { createRoot, hydrateRoot } from 'react-dom/client';
import { createInertiaApp } from '@inertiajs/react';
import { resolve } from './resolve';

void createInertiaApp({
  resolve,
  setup: ({ el, App, props }) => {
    const element = <App {...props} />;
    if (el.hasChildNodes()) hydrateRoot(el, element);
    else createRoot(el).render(element);
  },
});
