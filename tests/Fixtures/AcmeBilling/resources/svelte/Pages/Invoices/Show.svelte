<script module lang="ts">
  export { default as layout } from '../../Layouts/BillingLayout.svelte';
</script>

<script lang="ts">
  let { invoice }: { invoice: { id: number; reference: string } } = $props();
</script>

<svelte:head><title>{invoice.reference}</title></svelte:head>

<section data-testid="vendor-card" class="space-y-3 rounded-xl bg-fuchsia-700 p-7 text-white">
  <h1 data-testid="vendor-page">Package invoice</h1>
  <p data-testid="invoice-prop">{invoice.reference}</p>
  <p>This Svelte page and its persistent layout are shipped by the example package.</p>
</section>
