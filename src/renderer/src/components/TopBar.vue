<template>
  <header class="app-topbar" aria-label="OpenClaw titlebar">
    <div class="app-topbar-left">
      <img class="app-topbar-logo" :src="openclawLogoUrl" alt="OpenClaw logo" />
      <div>
        <div class="app-topbar-title">OpenClaw Pilot</div>
        <div class="app-topbar-subtitle">Installer</div>
      </div>
    </div>
    <div class="app-topbar-right">
      <span class="app-topbar-status">Ready</span>
    </div>
  </header>
</template>

<script setup lang="ts">
import { openclawLogoUrl } from '../assets/branding'
</script>
