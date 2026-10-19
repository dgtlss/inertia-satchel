<script setup lang="ts">
import { Link } from '@inertiajs/vue3';
import AppLayout from '../../../../Layouts/AppLayout.vue';
defineOptions({ layout: AppLayout });
defineProps<{ invoices: { id: number; reference: string }[] }>();
</script>

<template>
  <section class="space-y-4 rounded-xl bg-lime-100 p-6">
    <h1 class="text-3xl font-semibold" data-testid="override-page">App invoice list override</h1>
    <p>This file wins over the package's Invoices/Index.vue.</p>
    <ul>
      <li v-for="invoice in invoices" :key="invoice.id">
        <Link :href="`/billing/invoices/${invoice.id}`" class="text-blue-700 underline">{{ invoice.reference }}</Link>
      </li>
    </ul>
  </section>
</template>
