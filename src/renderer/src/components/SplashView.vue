<template>
  <section class="splash-shell">
    <div class="splash-card">
      <img class="splash-logo" :src="openclawLogoUrl" alt="OpenClaw logo" />
      <h1 class="splash-title">openclaw🦞正在启动中，你的小龙虾马上就位</h1>
      <div class="splash-progress" role="progressbar" aria-label="OpenClaw 启动进度">
        <div class="splash-progress-track">
          <div class="splash-progress-bar"></div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { openclawLogoUrl } from '../assets/branding'
</script>
