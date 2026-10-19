<script module lang="ts">
  export { default as layout } from '../Layouts/AppLayout.svelte';
</script>

<script lang="ts">
  let { message }: { message: string } = $props();
</script>

<section><h1>Satchel Svelte example</h1><p data-testid="home-prop">{message}</p></section>
