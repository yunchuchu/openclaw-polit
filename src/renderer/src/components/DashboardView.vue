<template>
  <section class="dashboard-shell">
    <header class="dashboard-bar">
      <span>OpenClaw Dashboard</span>
      <span class="status-dot"></span>
    </header>
    <webview :src="url" class="dashboard-webview" />
  </section>
</template>

<script setup lang="ts">
defineProps<{ url: string }>()
</script>
