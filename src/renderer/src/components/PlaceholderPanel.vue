<template>
  <section class="placeholder-panel">
    <div class="placeholder-card">
      <h2>{{ title }}</h2>
      <p>{{ description }}</p>
      <div class="placeholder-tag">敬请期待</div>
    </div>
  </section>
</template>

<script setup lang="ts">
defineProps<{
  title: string
  description: string
}>()
</script>
