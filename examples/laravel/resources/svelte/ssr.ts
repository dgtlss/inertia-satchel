import createServer from '@inertiajs/svelte/server';
import { renderPage } from './render';

createServer(renderPage, { host: '127.0.0.1' });
