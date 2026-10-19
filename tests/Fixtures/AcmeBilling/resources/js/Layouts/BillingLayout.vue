<script setup lang="ts">
import { ref } from 'vue';
import { Link } from '@inertiajs/vue3';
const count = ref(0);
</script>

<template>
  <div class="mx-auto max-w-3xl space-y-6 p-8">
    <header data-testid="vendor-layout" class="space-y-4 border-b border-slate-200 pb-5">
      <p class="text-lg font-semibold">Acme Billing · package layout</p>
      <nav class="flex gap-5 text-blue-700">
        <Link href="/">Home</Link>
        <Link href="/billing/invoices">Invoices</Link>
        <Link href="/billing/invoices/43">Next invoice</Link>
      </nav>
      <button class="rounded bg-slate-100 p-2" data-testid="layout-counter" @click="count++">Layout count: {{ count }}</button>
    </header>
    <main><slot /></main>
  </div>
</template>
