import type { Plugin } from 'vite';
import type { Page } from '@inertiajs/core';

/** Example-only bridge for Inertia Laravel's development SSR HTTP gateway. */
export default function devSsr(entry: string): Plugin {
  return {
    name: 'satchel-example-dev-ssr',
    apply: 'serve',
    configureServer(server) {
      // Load through Vite on every request, so its public module graph handles
      // page edits and Satchel's manifest/override invalidations.
      const load = async () => {
        const module = await server.ssrLoadModule(`/${entry}`);
        return module.renderPage as (page: Page) => Promise<unknown>;
      };
      server.middlewares.use(async (request, response, next) => {
        if (request.url?.split('?')[0] !== '/__inertia_ssr' || !['GET', 'POST'].includes(request.method ?? '')) {
          next();
          return;
        }
        response.setHeader('Content-Type', 'application/json');
        try {
          const render = await load();
          if (request.method === 'GET') {
            response.end(JSON.stringify({ status: 'OK' }));
            return;
          }
          request.setEncoding('utf8');
          let body = '';
          for await (const chunk of request) body += chunk;
          let page: Page;
          try { page = JSON.parse(body) as Page; } catch {
            response.statusCode = 400;
            response.end(JSON.stringify({ error: 'The SSR request must contain a JSON Inertia page.' }));
            return;
          }
          response.end(JSON.stringify(await render(page)));
        } catch (cause) {
          const error = cause instanceof Error ? cause : new Error(String(cause));
          server.ssrFixStacktrace(error);
          server.config.logger.error(error.stack ?? error.message);
          response.statusCode = 500;
          response.end(JSON.stringify({ error: error.message }));
        }
      });
    },
  };
}
