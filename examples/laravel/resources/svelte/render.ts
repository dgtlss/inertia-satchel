import { render } from 'svelte/server';
import { createInertiaApp } from '@inertiajs/svelte';
import type { Page } from '@inertiajs/core';
import { resolve } from './resolve';

export async function renderPage(page: Page) {
  const response = await createInertiaApp({
    page,
    resolve,
    setup: ({ App, props }) => render(App, { props }),
  });
  if (!response) throw new Error('The Svelte SSR adapter did not return a response.');
  return response;
}
