import './assets/main.css'

import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import { useUserStore } from './stores/user'
import { useSocketStore } from './stores/socket'
import axios from 'axios'

// 创建应用实例
const app = createApp(App)

// 注册所有图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

// 创建并使用Pinia状态管理
const pinia = createPinia()
app.use(pinia)

// 使用ElementPlus和中文语言包
app.use(ElementPlus, {
  locale: zhCn
})

// 使用Vue Router
app.use(router)

// 挂载应用
app.mount('#app')

// 初始化WebSocket连接（如果用户已登录）
const initWebSocket = async () => {
  const userStore = useUserStore()
  const socketStore = useSocketStore()
  
  // 确保DOM已完全加载
  await new Promise(resolve => setTimeout(resolve, 500))
  
  // 仅在用户已登录且有有效token时连接WebSocket
  if (userStore.isLoggedIn && userStore.token) {
    try {
      console.log('用户已登录，正在自动连接WebSocket...')
      // 先尝试获取最新的用户信息，确保token有效
      const userData = await userStore.fetchCurrentUser()
      
      if (userData) {
        await socketStore.connect()
        console.log('WebSocket连接成功')
      } else {
        console.warn('获取用户信息失败，不进行WebSocket连接')
      }
    } catch (error) {
      console.error('WebSocket自动连接失败:', error)
      // 不要自动重试，让用户刷新页面或进行其他操作时重新连接
    }
  } else {
    console.log('用户未登录或无有效token，无需连接WebSocket')
  }
}

// 应用挂载后初始化WebSocket
initWebSocket()

// 导航守卫，检查登录状态和刷新用户信息
router.beforeEach(async (to, from, next) => {
  const userStore = useUserStore()
  
  // 如果已登录但没有完整用户信息，尝试获取
  if (userStore.isLoggedIn && !userStore.userInfo.id) {
    try {
      await userStore.fetchCurrentUser()
    } catch (error) {
      console.error('获取用户信息失败', error)
    }
  }
  
  // 检查是否需要登录
  if (to.meta.requiresAuth && !userStore.isLoggedIn) {
    next({ name: 'Login', query: { redirect: to.fullPath } })
  } else {
    next()
  }
})
