<script module lang="ts">
  export { default as layout } from '../../../../Layouts/AppLayout.svelte';
</script>

<script lang="ts">
  import { Link } from '@inertiajs/svelte';
  let { invoices }: { invoices: { id: number; reference: string }[] } = $props();
</script>

<section class="space-y-4 rounded-xl bg-lime-100 p-6">
  <h1 data-testid="override-page">App invoice list override</h1>
  <ul>{#each invoices as invoice (invoice.id)}
    <li><Link href={`/billing/invoices/${invoice.id}`}>{invoice.reference}</Link></li>
  {/each}</ul>
</section>
