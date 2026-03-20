<template>
  <section class="dashboard-shell">
    <div v-if="!url" class="dashboard-empty">
      <div class="spinner"></div>
      <p>{{ loading ? '正在启动控制台，请稍候…' : '控制台尚未连接' }}</p>
    </div>
    <div v-else class="dashboard-frame">
      <webview
        ref="webviewRef"
        :src="url"
        class="dashboard-webview"
        style="flex: 1 1 auto; width: 100%; height: 100%; border: 0;"
      />
      <div v-if="loading" class="dashboard-loading">
        <div class="spinner"></div>
        <p>正在启动控制台，请稍候…</p>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    url: string | null
    loading?: boolean
  }>(),
  { loading: false }
)

const webviewRef = ref<any>(null)

const injectFullHeightCss = () => {
  const webview = webviewRef.value
  if (!webview || typeof webview.insertCSS !== 'function') return
  const css = `
    html, body {
      width: 100% !important;
      height: 100% !important;
      margin: 0 !important;
      padding: 0 !important;
      overflow: hidden !important;
    }
    #app, #root, .app, .app-shell, .layout, .page {
      width: 100% !important;
      height: 100% !important;
      min-height: 100% !important;
    }
  `
  webview.insertCSS(css).catch(() => {})
}

const fixWebviewIframe = () => {
  const webview = webviewRef.value as any
  if (!webview) return
  try {
    webview.style.height = '100%'
    webview.style.minHeight = '100%'
    webview.style.flex = '1 1 auto'
    const shadow = webview.shadowRoot
    const iframe = shadow?.querySelector('iframe') as HTMLIFrameElement | null
    if (iframe) {
      iframe.style.height = '100%'
      iframe.style.minHeight = '100%'
      iframe.style.width = '100%'
      iframe.style.flex = '1 1 auto'
      iframe.style.border = '0'
    }
  } catch {}
}

const ensureIframeHeight = () => {
  let attempts = 0
  const tick = () => {
    attempts += 1
    fixWebviewIframe()
    if (attempts < 6) {
      setTimeout(tick, 200)
    }
  }
  tick()
}

const enforceIframeHeight = () => {
  const webview = webviewRef.value
  if (!webview || typeof webview.executeJavaScript !== 'function') return
  const script = `
    (function () {
      try {
        document.documentElement.style.height = '100%';
        document.body.style.height = '100%';
        document.body.style.margin = '0';
        document.body.style.padding = '0';
        var iframe = document.querySelector('iframe');
        if (iframe) {
          iframe.style.height = '100%';
          iframe.style.minHeight = '100%';
          iframe.style.width = '100%';
          iframe.style.flex = '1 1 auto';
          iframe.style.border = '0';
        }
      } catch (e) {}
    })();
  `
  webview.executeJavaScript(script).catch(() => {})
}


onMounted(() => {
  const webview = webviewRef.value
  if (!webview) return
  webview.addEventListener('dom-ready', () => {
    injectFullHeightCss()
    enforceIframeHeight()
    ensureIframeHeight()
  })
  webview.addEventListener('did-finish-load', () => {
    enforceIframeHeight()
    ensureIframeHeight()
  })
  webview.addEventListener('did-attach', ensureIframeHeight)
  ensureIframeHeight()
})

watch(
  () => props.url,
  () => {
    injectFullHeightCss()
    enforceIframeHeight()
    ensureIframeHeight()
  }
)
</script>
