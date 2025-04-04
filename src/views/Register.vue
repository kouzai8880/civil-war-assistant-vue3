<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/user'
import { ElMessage } from 'element-plus'

const router = useRouter()
const userStore = useUserStore()

// 表单数据
const registerForm = reactive({
  username: '',
  password: '',
  confirmPassword: '',
  phone: '',
  code: '',
  agreement: false
})

// 短信倒计时
const countdown = ref(0)
const countdownTimer = ref(null)

// 加载状态
const loading = ref(false)

// 表单校验规则
const registerRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 20, message: '长度在3到20个字符', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, max: 20, message: '长度在6到20个字符', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请确认密码', trigger: 'blur' },
    {
      validator: (rule, value, callback) => {
        if (value !== registerForm.password) {
          callback(new Error('两次输入的密码不一致'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ],
  phone: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号码', trigger: 'blur' }
  ],
  code: [
    { required: true, message: '请输入验证码', trigger: 'blur' },
    { len: 6, message: '验证码长度为6位', trigger: 'blur' }
  ],
  agreement: [
    {
      validator: (rule, value, callback) => {
        if (!value) {
          callback(new Error('请同意用户协议'))
        } else {
          callback()
        }
      },
      trigger: 'change'
    }
  ]
}

// 注册表单引用
const registerFormRef = ref(null)

// 获取短信验证码
const getSmsCode = async () => {
  try {
    // 验证手机号格式
    const phoneValid = await registerFormRef.value.validateField('phone')
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

// 处理注册
const handleRegister = async () => {
  try {
    // 表单验证
    await registerFormRef.value.validate()
    
    // 防止重复提交
    if (loading.value) return
    loading.value = true
    
    // 注册处理
    const registerData = {
      username: registerForm.username,
      password: registerForm.password,
      phone: registerForm.phone,
      code: registerForm.code
    }
    
    const success = await userStore.register(registerData)
    
    if (success) {
      ElMessage.success('注册成功，正在跳转到登录页')
      router.push('/login')
    } else {
      ElMessage.error(userStore.error || '注册失败，请稍后重试')
    }
  } catch (error) {
    console.error('注册失败:', error)
    ElMessage.error('注册失败，请检查输入')
  } finally {
    loading.value = false
  }
}

// 去登录
const goToLogin = () => {
  router.push('/login')
}
</script>

<template>
  <div class="register-container">
    <div class="register-card energy-border">
      <div class="register-header">
        <h2 class="register-title">用户注册</h2>
        <p class="register-subtitle">创建您的游戏内战助手账号</p>
      </div>
      
      <el-form
        ref="registerFormRef"
        :model="registerForm"
        :rules="registerRules"
        class="register-form"
        @submit.prevent="handleRegister"
      >
        <el-form-item prop="username">
          <el-input
            v-model="registerForm.username"
            placeholder="请设置用户名"
            prefix-icon="User"
          />
        </el-form-item>
        
        <el-form-item prop="password">
          <el-input
            v-model="registerForm.password"
            type="password"
            placeholder="请设置密码"
            prefix-icon="Lock"
            show-password
          />
        </el-form-item>
        
        <el-form-item prop="confirmPassword">
          <el-input
            v-model="registerForm.confirmPassword"
            type="password"
            placeholder="请确认密码"
            prefix-icon="Lock"
            show-password
          />
        </el-form-item>
        
        <el-form-item prop="phone">
          <el-input
            v-model="registerForm.phone"
            placeholder="请输入手机号"
            prefix-icon="Iphone"
            maxlength="11"
          />
        </el-form-item>
        
        <el-form-item prop="code">
          <el-input
            v-model="registerForm.code"
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
        
        <el-form-item prop="agreement">
          <el-checkbox v-model="registerForm.agreement">
            我已阅读并同意
            <el-link type="primary" :underline="false">用户协议</el-link>
            和
            <el-link type="primary" :underline="false">隐私政策</el-link>
          </el-checkbox>
        </el-form-item>
        
        <el-form-item>
          <el-button 
            type="primary" 
            class="register-button" 
            :loading="loading"
            @click="handleRegister"
          >
            注册
          </el-button>
        </el-form-item>
      </el-form>
      
      <div class="register-footer">
        <p>已有账号？ <el-button link type="primary" @click="goToLogin">立即登录</el-button></p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.register-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: calc(100vh - 60px);
  background: var(--bg-dark);
  position: relative;
}

.register-container::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: radial-gradient(circle at 50% 50%, rgba(123,104,238,0.1) 0%, rgba(10,11,14,0) 70%);
  z-index: 0;
}

.register-card {
  width: 400px;
  background-color: var(--bg-card);
  border-radius: 12px;
  padding: var(--spacing-xl);
  position: relative;
  z-index: 1;
}

.register-header {
  text-align: center;
  margin-bottom: var(--spacing-lg);
}

.register-title {
  font-family: var(--font-display);
  font-size: 28px;
  margin: 0 0 var(--spacing-xs) 0;
}

.register-subtitle {
  color: var(--text-secondary);
  margin: 0;
}

.register-form {
  margin-bottom: var(--spacing-md);
}

.register-button {
  width: 100%;
  height: 44px;
  background: linear-gradient(135deg, var(--theme-primary) 0%, var(--theme-secondary) 100%);
  border: none;
  font-size: 16px;
}

.register-footer {
  text-align: center;
  color: var(--text-secondary);
  margin-top: var(--spacing-lg);
}

/* 响应式调整 */
@media (max-width: 480px) {
  .register-card {
    width: 90%;
    padding: var(--spacing-lg);
  }
}
</style> 