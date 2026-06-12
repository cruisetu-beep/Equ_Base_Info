// ── main.js ────────────────────────────────────────────────────────
import { createApp } from 'vue'
import { createPinia } from 'pinia'

// 全局样式（原 Info_base_2.html <head> style + GlobalStyles 模板字符串，零修改）
import '@/style/global.css'
import '@/style/components.css'

import App from './App.vue'

const app = createApp(App)
app.use(createPinia())
app.mount('#app')
