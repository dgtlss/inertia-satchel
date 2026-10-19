<script setup lang="ts">
import BillingLayout from '../../Layouts/BillingLayout.vue';
defineOptions({ layout: BillingLayout });
defineProps<{ invoice: { id: number; reference: string } }>();
</script>

<template>
  <section data-testid="vendor-card" class="space-y-3 rounded-xl bg-fuchsia-700 p-7 text-white">
    <h1 class="text-3xl font-semibold" data-testid="vendor-page">Package invoice</h1>
    <p data-testid="invoice-prop">{{ invoice.reference }}</p>
    <p>This page and its persistent layout are shipped by the example package.</p>
  </section>
</template>
