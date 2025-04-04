<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()

const goHome = () => {
  router.push('/')
}
</script>

<template>
  <div class="not-found-container">
    <div class="not-found-content">
      <h1 class="error-code">404</h1>
      <div class="error-title">页面未找到</div>
      <p class="error-message">抱歉，您访问的页面不存在或已被移除</p>
      <el-button type="primary" @click="goHome">返回首页</el-button>
    </div>
  </div>
</template>

<style scoped>
.not-found-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: calc(100vh - 60px);
  text-align: center;
}

.not-found-content {
  max-width: 500px;
  padding: var(--spacing-xl);
}

.error-code {
  font-size: 120px;
  margin: 0;
  font-family: var(--font-display);
  background: linear-gradient(to right, var(--theme-primary), var(--theme-secondary));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.error-title {
  font-size: 32px;
  margin: var(--spacing-md) 0;
  font-weight: bold;
}

.error-message {
  color: var(--text-secondary);
  margin-bottom: var(--spacing-xl);
}
</style> 