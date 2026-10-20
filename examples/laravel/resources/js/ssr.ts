import createServer from '@inertiajs/vue3/server';
import { renderPage } from './render';

createServer(renderPage, { host: '127.0.0.1' });
