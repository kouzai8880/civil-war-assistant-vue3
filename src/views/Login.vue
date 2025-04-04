<script setup>
import { ref, reactive } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '../stores/user'
import { ElMessage } from 'element-plus'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

// 登录方式
const loginType = ref('password') // 'password' 或 'sms'

// 账号密码表单
const passwordForm = reactive({
  username: '',
  password: '',
  remember: true
})

// 手机验证码表单
const smsForm = reactive({
  phone: '',
  code: '',
  remember: true
})

// 短信倒计时
const countdown = ref(0)
const countdownTimer = ref(null)

// 加载状态
const loading = ref(false)

// 表单校验规则
const passwordRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 20, message: '长度在3到20个字符', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, max: 20, message: '长度在6到20个字符', trigger: 'blur' }
  ]
}

const smsRules = {
  phone: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号码', trigger: 'blur' }
  ],
  code: [
    { required: true, message: '请输入验证码', trigger: 'blur' },
    { len: 6, message: '验证码长度为6位', trigger: 'blur' }
  ]
}

// 密码登录表单引用
const passwordFormRef = ref(null)

// 短信登录表单引用
const smsFormRef = ref(null)

// 切换登录方式
const switchLoginType = (type) => {
  loginType.value = type
}

// 获取短信验证码
const getSmsCode = async () => {
  try {
    // 验证手机号格式
    const phoneValid = await smsFormRef.value.validateField('phone')
    if (phoneValid !== true) return
    
    // 开始倒计时
    countdown.value = 60
    countdownTimer.value = setInterval(() => {
      countdown.value--
      if (countdown.value <= 0) {
        clearInterval(countdownTimer.value)
        countdownTimer.value = null
      }
    }, 1000)
    
    // 模拟API调用
    ElMessage.success('验证码已发送，请注意查收')
  } catch (error) {
    console.error('获取验证码失败:', error)
  }
}

// 处理登录
const handleLogin = async () => {
  try {
    // 根据登录方式选择表单
    const formRef = loginType.value === 'password' ? passwordFormRef.value : smsFormRef.value
    const form = loginType.value === 'password' ? passwordForm : smsForm
    
    // 表单验证
    await formRef.validate()
    
    // 防止重复提交
    if (loading.value) return
    loading.value = true
    
    // 登录处理
    const loginData = loginType.value === 'password' 
      ? { username: form.username, password: form.password }
      : { phone: form.phone, code: form.code }
    
    const success = await userStore.login(loginData)
    
    if (success) {
      ElMessage.success('登录成功')
      
      // 登录成功后的跳转
      const redirectUrl = route.query.redirect || '/'
      router.push(redirectUrl)
    } else {
      ElMessage.error(userStore.error || '登录失败，请稍后重试')
    }
  } catch (error) {
    console.error('登录失败:', error)
    ElMessage.error('登录失败，请检查输入')
  } finally {
    loading.value = false
  }
}

// 去注册
const goToRegister = () => {
  router.push('/register')
}
</script>

<template>
  <div class="login-container">
    <div class="login-card energy-border">
      <div class="login-header">
        <h2 class="login-title">用户登录</h2>
        <p class="login-subtitle">欢迎回到游戏内战助手</p>
      </div>
      
      <div class="login-tabs">
        <div 
          :class="['login-tab', { active: loginType === 'password' }]" 
          @click="switchLoginType('password')"
        >
          账号密码登录
        </div>
        <div 
          :class="['login-tab', { active: loginType === 'sms' }]" 
          @click="switchLoginType('sms')"
        >
          手机验证登录
        </div>
      </div>
      
      <!-- 账号密码登录 -->
      <el-form
        v-if="loginType === 'password'"
        ref="passwordFormRef"
        :model="passwordForm"
        :rules="passwordRules"
        class="login-form"
        @submit.prevent="handleLogin"
      >
        <el-form-item prop="username">
          <el-input
            v-model="passwordForm.username"
            placeholder="请输入用户名"
            prefix-icon="User"
          />
        </el-form-item>
        
        <el-form-item prop="password">
          <el-input
            v-model="passwordForm.password"
            type="password"
            placeholder="请输入密码"
            prefix-icon="Lock"
            show-password
          />
        </el-form-item>
        
        <div class="form-option">
          <el-checkbox v-model="passwordForm.remember">记住我</el-checkbox>
          <el-link type="primary" :underline="false">忘记密码？</el-link>
        </div>
        
        <el-form-item>
          <el-button 
            type="primary" 
            class="login-button" 
            :loading="loading"
            @click="handleLogin"
          >
            登录
          </el-button>
        </el-form-item>
      </el-form>
      
      <!-- 手机验证码登录 -->
      <el-form
        v-if="loginType === 'sms'"
        ref="smsFormRef"
        :model="smsForm"
        :rules="smsRules"
        class="login-form"
        @submit.prevent="handleLogin"
      >
        <el-form-item prop="phone">
          <el-input
            v-model="smsForm.phone"
            placeholder="请输入手机号"
            prefix-icon="Iphone"
            maxlength="11"
          />
        </el-form-item>
        
        <el-form-item prop="code">
          <el-input
            v-model="smsForm.code"
            placeholder="请输入验证码"
            prefix-icon="ChatLineRound"
            maxlength="6"
          >
            <template #append>
              <el-button 
                :disabled="countdown > 0" 
                @click="getSmsCode"
              >
                {{ countdown > 0 ? `${countdown}s` : '获取验证码' }}
              </el-button>
            </template>
          </el-input>
        </el-form-item>
        
        <div class="form-option">
          <el-checkbox v-model="smsForm.remember">记住我</el-checkbox>
        </div>
        
        <el-form-item>
          <el-button 
            type="primary" 
            class="login-button" 
            :loading="loading"
            @click="handleLogin"
          >
            登录
          </el-button>
        </el-form-item>
      </el-form>
      
      <div class="login-footer">
        <p>还没有账号？ <el-button link type="primary" @click="goToRegister">立即注册</el-button></p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: calc(100vh - 60px);
  background: var(--bg-dark);
  position: relative;
}

.login-container::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: radial-gradient(circle at 50% 50%, rgba(123,104,238,0.1) 0%, rgba(10,11,14,0) 70%);
  z-index: 0;
}

.login-card {
  width: 400px;
  background-color: var(--bg-card);
  border-radius: 12px;
  padding: var(--spacing-xl);
  position: relative;
  z-index: 1;
}

.login-header {
  text-align: center;
  margin-bottom: var(--spacing-lg);
}

.login-title {
  font-family: var(--font-display);
  font-size: 28px;
  margin: 0 0 var(--spacing-xs) 0;
}

.login-subtitle {
  color: var(--text-secondary);
  margin: 0;
}

.login-tabs {
  display: flex;
  margin-bottom: var(--spacing-lg);
  border-bottom: 1px solid rgba(123,104,238,0.2);
}

.login-tab {
  flex: 1;
  text-align: center;
  padding: var(--spacing-sm) 0;
  cursor: pointer;
  transition: color 0.3s;
  color: var(--text-secondary);
}

.login-tab:hover {
  color: var(--text-primary);
}

.login-tab.active {
  color: var(--theme-primary);
  border-bottom: 2px solid var(--theme-primary);
}

.login-form {
  margin-bottom: var(--spacing-md);
}

.form-option {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-md);
  color: var(--text-secondary);
}

.login-button {
  width: 100%;
  height: 44px;
  background: linear-gradient(135deg, var(--theme-primary) 0%, var(--theme-secondary) 100%);
  border: none;
  font-size: 16px;
}

.login-footer {
  text-align: center;
  color: var(--text-secondary);
  margin-top: var(--spacing-lg);
}

/* 响应式调整 */
@media (max-width: 480px) {
  .login-card {
    width: 90%;
    padding: var(--spacing-lg);
  }
}
</style> 