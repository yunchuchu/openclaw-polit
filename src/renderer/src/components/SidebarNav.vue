<template>
  <aside class="sidebar">
    <div class="sidebar-top">
      <button
        class="nav-button"
        :class="{ active: active === 'console' }"
        :disabled="disabled"
        type="button"
        aria-label="OpenClaw 控制台"
        @click="emit('select', 'console')"
      >
        <span class="nav-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 12h6"></path>
            <path d="M14 12h6"></path>
            <path d="M8 6c-2 0-4 2.5-4 5.5S6 19 8 19c1.5 0 2.7-1.1 4-1.1 1.3 0 2.5 1.1 4 1.1 2 0 4-2.5 4-5.5S18 6 16 6c-1.5 0-2.7 1.1-4 1.1C10.7 7.1 9.5 6 8 6z"></path>
          </svg>
        </span>
        <span class="nav-label">控制台</span>
      </button>
      <button
        class="nav-button"
        :class="{ active: active === 'skill' }"
        :disabled="disabled"
        type="button"
        aria-label="安装 Skill 插件"
        @click="emit('select', 'skill')"
      >
        <span class="nav-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
            <path d="M8 8a2 2 0 1 1 4 0v2"></path>
            <path d="M12 10h2a2 2 0 1 1 0 4h-2"></path>
            <path d="M12 14v2a2 2 0 1 1-4 0v-2"></path>
            <path d="M8 14H6a2 2 0 1 1 0-4h2"></path>
          </svg>
        </span>
        <span class="nav-label">Skill</span>
      </button>
    </div>
    <div class="sidebar-bottom">
      <button
        class="nav-button"
        :class="{ active: active === 'settings' }"
        :disabled="disabled"
        type="button"
        aria-label="设置"
        @click="emit('select', 'settings')"
      >
        <span class="nav-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M19.4 15a1.8 1.8 0 0 0 .4 2l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.8 1.8 0 0 0-2-.4 1.8 1.8 0 0 0-1 1.6V22a2 2 0 1 1-4 0v-.1a1.8 1.8 0 0 0-1-1.6 1.8 1.8 0 0 0-2 .4l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.8 1.8 0 0 0 .4-2 1.8 1.8 0 0 0-1.6-1H2a2 2 0 1 1 0-4h.1a1.8 1.8 0 0 0 1.6-1 1.8 1.8 0 0 0-.4-2l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.8 1.8 0 0 0 2 .4 1.8 1.8 0 0 0 1-1.6V2a2 2 0 1 1 4 0v.1a1.8 1.8 0 0 0 1 1.6 1.8 1.8 0 0 0 2-.4l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.8 1.8 0 0 0-.4 2 1.8 1.8 0 0 0 1.6 1H22a2 2 0 1 1 0 4h-.1a1.8 1.8 0 0 0-1.6 1z"></path>
          </svg>
        </span>
        <span class="nav-label">设置</span>
      </button>
      <div class="sidebar-brand" aria-label="OpenClaw">
        <img class="sidebar-logo" :src="openclawLogoUrl" alt="OpenClaw" />
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { openclawLogoUrl } from '../assets/branding'

defineProps<{
  active: 'console' | 'skill' | 'settings'
  disabled?: boolean
}>()

const emit = defineEmits<{
  (event: 'select', value: 'console' | 'skill' | 'settings'): void
}>()
</script>
