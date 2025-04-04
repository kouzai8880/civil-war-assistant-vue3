import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

/**
 * 用户状态管理
 * 处理用户登录、注册等操作和状态
 */
export const useUserStore = defineStore('user', () => {
  // 状态
  const token = ref(localStorage.getItem('token') || '')
  const userInfo = ref(JSON.parse(localStorage.getItem('userInfo') || '{}'))
  const isLoading = ref(false)
  const error = ref(null)

  // 计算属性
  const isLoggedIn = computed(() => Boolean(token.value))
  const username = computed(() => userInfo.value.username || '')
  const userId = computed(() => userInfo.value.id || '')
  const avatar = computed(() => userInfo.value.avatar || '')

  // 方法
  // 登录
  const login = async (credentials) => {
    isLoading.value = true
    error.value = null
    
    try {
      // 模拟登录API调用，后续替换为真实接口
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // 模拟登录成功
      const mockResponse = {
        token: 'mock-jwt-token',
        user: {
          id: '1',
          username: credentials.username,
          email: 'user@example.com',
          avatar: 'https://via.placeholder.com/150',
          level: 1,
          points: 0
        }
      }
      
      // 保存凭证
      token.value = mockResponse.token
      userInfo.value = mockResponse.user
      
      // 保存到本地存储
      localStorage.setItem('token', token.value)
      localStorage.setItem('userInfo', JSON.stringify(userInfo.value))
      
      return true
    } catch (err) {
      error.value = err.message || '登录失败，请稍后重试'
      return false
    } finally {
      isLoading.value = false
    }
  }

  // 注册
  const register = async (userData) => {
    isLoading.value = true
    error.value = null
    
    try {
      // 模拟注册API调用，后续替换为真实接口
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // 模拟注册成功
      const mockResponse = {
        user: {
          id: Date.now().toString(),
          username: userData.username,
          email: userData.email,
          avatar: 'https://via.placeholder.com/150',
          level: 1,
          points: 0
        }
      }
      
      userInfo.value = mockResponse.user
      
      return true
    } catch (err) {
      error.value = err.message || '注册失败，请稍后重试'
      return false
    } finally {
      isLoading.value = false
    }
  }

  // 登出
  const logout = () => {
    token.value = ''
    userInfo.value = {}
    localStorage.removeItem('token')
    localStorage.removeItem('userInfo')
  }

  // 更新用户信息
  const updateUserInfo = (newUserInfo) => {
    userInfo.value = { ...userInfo.value, ...newUserInfo }
    localStorage.setItem('userInfo', JSON.stringify(userInfo.value))
  }

  return {
    // 状态
    token,
    userInfo,
    isLoading,
    error,
    
    // 计算属性
    isLoggedIn,
    username,
    userId,
    avatar,
    
    // 方法
    login,
    register,
    logout,
    updateUserInfo
  }
}) 