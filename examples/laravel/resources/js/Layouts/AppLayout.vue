<script setup lang="ts">
import { Link } from '@inertiajs/vue3';
</script>

<template>
  <div class="mx-auto max-w-3xl space-y-6 p-8">
    <header data-testid="app-layout" class="space-y-4 border-b border-slate-200 pb-5">
      <p class="text-lg font-semibold">Satchel · app layout</p>
      <nav class="flex gap-5 text-blue-700">
        <Link href="/">Home</Link>
        <Link href="/billing/invoices">Invoices</Link>
        <Link href="/billing/invoices/42">Vendor invoice</Link>
      </nav>
    </header>
    <main><slot /></main>
  </div>
</template>
