import { renderToString } from 'react-dom/server';
import { createInertiaApp } from '@inertiajs/react';
import type { Page } from '@inertiajs/core';
import { resolve } from './resolve';

export const renderPage = (page: Page) => createInertiaApp({
  page,
  render: renderToString,
  resolve,
  setup: ({ App, props }) => <App {...props} />,
});
