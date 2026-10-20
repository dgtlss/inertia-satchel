import { createInertiaApp } from '@inertiajs/svelte';
import { resolve } from './resolve';

// The public Svelte adapter hydrates data-server-rendered roots automatically.
void createInertiaApp({ resolve });
