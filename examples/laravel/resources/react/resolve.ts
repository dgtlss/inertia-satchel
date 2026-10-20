import type { ComponentType } from 'react';
import { resolveSatchel } from '@dgtlss/satchel';
import type { PageModule } from '@dgtlss/satchel';

const pages = import.meta.glob<PageModule<ComponentType>>(['./Pages/**/*.tsx', '!./Pages/vendor/**']);

export const resolve = resolveSatchel<ComponentType>((name) => {
  const load = pages[`./Pages/${name}.tsx`];
  if (!load) throw new Error(`App page [${name}] was not found.`);
  return load();
});
