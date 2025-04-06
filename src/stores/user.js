import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { userApi } from '../services/api'

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
    
    console.log('开始登录，凭证:', credentials)
    
    try {
      const response = await userApi.login(credentials)
      console.log('登录响应处理:', response)
      
      if (response.status === 'success') {
        console.log('登录成功，保存用户信息和token')
        // 保存凭证
        token.value = response.token
        userInfo.value = response.user
        
        // 保存到本地存储
        localStorage.setItem('token', token.value)
        localStorage.setItem('userInfo', JSON.stringify(userInfo.value))
        
        console.log('登录完成，当前状态:', { 
          token: token.value ? '已设置' : '未设置', 
          userInfo: userInfo.value 
        })
        
        return true
      } else {
        console.error('登录响应状态不是success:', response)
        error.value = response.message || '登录失败'
        return false
      }
    } catch (err) {
      console.error('登录过程出错:', err)
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
      const response = await userApi.register(userData)
      
      if (response.status === 'success') {
        // 注册成功后自动登录
        token.value = response.data.token
        userInfo.value = response.data.user
        
        // 保存到本地存储
        localStorage.setItem('token', token.value)
        localStorage.setItem('userInfo', JSON.stringify(userInfo.value))
        
        return true
      } else {
        error.value = response.message || '注册失败'
        return false
      }
    } catch (err) {
      error.value = err.message || '注册失败，请稍后重试'
      return false
    } finally {
      isLoading.value = false
    }
  }

  // 获取当前用户信息
  const fetchCurrentUser = async () => {
    if (!token.value) {
      console.warn('获取用户信息失败: 用户未登录(无token)')
      return null
    }
    
    isLoading.value = true
    error.value = null
    
    try {
      console.log('正在调用API获取当前用户信息...')
      const response = await userApi.getCurrentUser()
      console.log('获取用户信息API响应:', response)
      
      if (response.status === 'success' && response.user) {
        // 更新用户信息
        userInfo.value = response.user
        
        // 只有在成功从服务器获取数据后才更新本地存储
        localStorage.setItem('userInfo', JSON.stringify(userInfo.value))
        
        console.log('成功从服务器获取并更新用户信息')
        return userInfo.value
      } else {
        console.error('获取用户信息失败:', response.message)
        error.value = response.message || '获取用户信息失败'
        
        // 清晰地记录API错误
        if (response.status === 'error') {
          console.error('API返回错误状态:', response.message)
        }
        
        return null
      }
    } catch (err) {
      console.error('获取用户信息出现异常:', err)
      error.value = err.message || '获取用户信息失败'
      
      // 如果是401错误，清空登录状态
      if (err.originalError?.response?.status === 401) {
        console.warn('获取用户信息返回401错误，执行登出操作')
        logout()
      }
      
      return null
    } finally {
      isLoading.value = false
    }
  }

  // 登出
  const logout = () => {
    console.log('执行登出操作')
    token.value = ''
    userInfo.value = {}
    localStorage.removeItem('token')
    localStorage.removeItem('userInfo')
    console.log('登出完成，清除了token和用户信息')
  }

  // 更新用户信息
  const updateUserInfo = async (newUserInfo) => {
    console.log('开始更新用户信息:', newUserInfo)
    
    if (!userId.value) {
      console.warn('更新失败: 用户未登录')
      return false
    }
    
    isLoading.value = true
    error.value = null
    
    try {
      // 调用API更新用户信息
      const response = await userApi.updateUserProfile(userId.value, newUserInfo)
      
      console.log('更新用户信息API响应:', response)
      
      if (response.status === 'success') {
        // 更新本地状态
        userInfo.value = { ...userInfo.value, ...newUserInfo }
        console.log('更新后的用户信息:', userInfo.value)
        
        // 更新到localStorage
        localStorage.setItem('userInfo', JSON.stringify(userInfo.value))
        console.log('用户信息已保存到localStorage')
        
        return true
      } else {
        throw new Error(response.message || '更新用户信息失败')
      }
    } catch (err) {
      console.error('更新用户信息错误:', err)
      error.value = err.message || '更新用户信息失败'
      return false
    } finally {
      isLoading.value = false
    }
  }

  // 修改密码
  const changePassword = async (passwordData) => {
    if (!userId.value) return false
    
    isLoading.value = true
    error.value = null
    
    try {
      const response = await userApi.changePassword(userId.value, passwordData)
      
      if (response.status === 'success') {
        return true
      } else {
        throw new Error(response.message || '修改密码失败')
      }
    } catch (err) {
      error.value = err.message || '修改密码失败'
      return false
    } finally {
      isLoading.value = false
    }
  }

  // 绑定游戏账号
  const bindGameAccount = async (gameData) => {
    isLoading.value = true
    error.value = null
    
    try {
      const response = await userApi.bindGameAccount(gameData)
      
      if (response.status === 'success') {
        return true
      } else {
        throw new Error(response.message || '绑定游戏账号失败')
      }
    } catch (err) {
      error.value = err.message || '绑定游戏账号失败'
      return false
    } finally {
      isLoading.value = false
    }
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
    fetchCurrentUser,
    logout,
    updateUserInfo,
    changePassword,
    bindGameAccount
  }
}) 