import { defineConfig } from 'electron-vite'
import { resolve } from 'node:path'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  main: {
    entry: 'src/main/index.ts',
    build: {
      rollupOptions: {
        external: ['node-pty']
      }
    }
  },
  preload: {
    input: 'src/preload/index.ts',
    build: {
      rollupOptions: {
        output: {
          format: 'cjs',
          entryFileNames: 'index.js'
        }
      }
    }
  },
  renderer: {
    root: 'src/renderer',
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src')
      }
    },
    plugins: [
      vue({
        template: {
          compilerOptions: {
            isCustomElement: (tag) => tag === 'webview'
          }
        }
      })
    ]
  }
})
