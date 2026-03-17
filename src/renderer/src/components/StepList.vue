<template>
  <ul class="step-list">
    <li
      v-for="(step, index) in steps"
      :key="step"
      :class="[
        'step-item',
        { 'is-active': index === currentIndex, 'is-done': index < currentIndex }
      ]"
    >
      <span class="step-index">{{ String(index + 1).padStart(2, '0') }}</span>
      <span class="step-label">{{ step }}</span>
    </li>
  </ul>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ steps: string[]; current: string }>()

const currentIndex = computed(() => props.steps.indexOf(props.current))
</script>
