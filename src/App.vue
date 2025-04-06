<script setup>
import { RouterView } from 'vue-router'
import MainLayout from './layouts/MainLayout.vue'
import { ref, onMounted, provide } from 'vue'
import { ElConfigProvider, ElAlert, ElButton } from 'element-plus'
import zhCn from 'element-plus/dist/locale/zh-cn.mjs'
import { userApi } from './services/api'

// API错误状态
const apiError = ref(false)
const apiErrorMessage = ref('')

// 检查API连接状态
const checkApiConnection = async () => {
  try {
    console.log('正在检查API连接状态...')
    const response = await userApi.getCurrentUser()
    
    if (response.status === 'error') {
      if (response.message?.includes('404')) {
        apiErrorMessage.value = '(接口路径可能不正确)'
        apiError.value = true
      } else {
        // 其他API错误
        apiErrorMessage.value = `(${response.message})`
        apiError.value = true
      }
    } else {
      // API正常响应
      apiError.value = false
      apiErrorMessage.value = ''
    }
  } catch (error) {
    console.error('API连接测试失败:', error)
    apiErrorMessage.value = `(${error.message || '未知错误'})`
    apiError.value = true
  }
}

// 重试API连接
const retryApiConnection = async () => {
  await checkApiConnection()
}

// 提供API连接状态给子组件使用
provide('apiStatus', {
  apiError,
  apiErrorMessage,
  retryApiConnection
})

// 初始化时检查API连接
onMounted(() => {
  checkApiConnection()
})
</script>

<template>
  <div class="app">
    <el-config-provider :locale="zhCn">
      <!-- API错误提示 -->
      <div v-if="apiError" class="api-error-banner">
        <el-alert
          title="API连接错误"
          type="error"
          :closable="false"
          show-icon
        >
          <template #default>
            后端API服务无法连接，部分功能可能不可用。{{ apiErrorMessage }}
            <el-button
              type="text"
              size="small"
              @click="retryApiConnection"
            >
              重试连接
            </el-button>
          </template>
        </el-alert>
      </div>
      <!-- 路由容器 -->
      <MainLayout>
        <RouterView />
      </MainLayout>
    </el-config-provider>
  </div>
</template>

<style>
.app {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

/* API错误提示条样式 */
.api-error-banner {
  position: sticky;
  top: 0;
  z-index: 2000;
  width: 100%;
}

/* 页面过渡动画 */
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: opacity 0.3s, transform 0.3s;
}

.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

/* 全局样式已在main.css中定义 */
</style>
