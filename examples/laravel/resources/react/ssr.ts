import createServer from '@inertiajs/react/server';
import { renderPage } from './render';

createServer(renderPage, { host: '127.0.0.1' });
