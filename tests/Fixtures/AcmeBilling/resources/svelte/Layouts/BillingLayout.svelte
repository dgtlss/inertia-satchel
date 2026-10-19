<script lang="ts">
  import { Link } from '@inertiajs/svelte';
  import type { Snippet } from 'svelte';
  let { children }: { children: Snippet } = $props();
  let count = $state(0);
</script>

<div class="mx-auto max-w-3xl space-y-6 p-8">
  <header data-testid="vendor-layout" class="space-y-4 border-b border-slate-200 pb-5">
    <p>Acme Billing · Svelte package layout</p>
    <nav class="flex gap-5 text-blue-700">
      <Link href="/">Home</Link>
      <Link href="/billing/invoices">Invoices</Link>
      <Link href="/billing/invoices/43">Next invoice</Link>
    </nav>
    <button data-testid="layout-counter" onclick={() => count++}>Layout count: {count}</button>
  </header>
  <main>{@render children()}</main>
</div>
