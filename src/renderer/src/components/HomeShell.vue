<template>
  <section class="home-shell">
    <SidebarNav :active="active" :disabled="disabled" @select="emit('select', $event)" />
    <main class="home-main">
      <slot name="main" />
    </main>
  </section>
</template>

<script setup lang="ts">
import SidebarNav from './SidebarNav.vue'

defineProps<{
  active: 'console' | 'skill' | 'settings'
  disabled?: boolean
}>()

const emit = defineEmits<{
  (event: 'select', value: 'console' | 'skill' | 'settings'): void
}>()
</script>
