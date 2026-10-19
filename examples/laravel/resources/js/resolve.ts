import type { DefineComponent } from 'vue';
import { resolveSatchel } from '@dgtlss/satchel';
import type { PageModule } from '@dgtlss/satchel';

const appPages = import.meta.glob<PageModule<DefineComponent>>(['./Pages/**/*.vue', '!./Pages/vendor/**']);

// Shared by browser and server entries; both consume the same manifest.
export const resolve = resolveSatchel<DefineComponent>((name) => {
  const load = appPages[`./Pages/${name}.vue`];
  if (!load) throw new Error(`App page [${name}] was not found.`);
  return load();
});
