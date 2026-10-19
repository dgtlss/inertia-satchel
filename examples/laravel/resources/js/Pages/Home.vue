<script setup lang="ts">
import AppLayout from '../Layouts/AppLayout.vue';
defineOptions({ layout: AppLayout });
defineProps<{ message: string }>();
</script>

<template>
  <section class="space-y-3">
    <h1 class="text-3xl font-semibold">Satchel Vue example</h1>
    <p data-testid="home-prop">{{ message }}</p>
    <p>Open a vendor invoice, then the app's overridden invoice list.</p>
  </section>
</template>
