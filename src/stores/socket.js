import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getSocket, connectSocket, disconnectSocket } from '../services/socket'
import { useUserStore } from './user'

/**
 * WebSocket连接状态管理
 */
export const useSocketStore = defineStore('socket', () => {
  // 状态
  const connected = ref(false)
  const connecting = ref(false)
  const error = ref(null)
  const listeners = ref({})
  const currentRoomId = ref(null)

  // 获取用户store
  const userStore = useUserStore()

  // 计算属性
  const isConnected = computed(() => connected.value)
  const isInRoom = computed(() => Boolean(currentRoomId.value))

  // 方法
  // 初始化WebSocket连接
  const connect = async () => {
    if (connected.value || connecting.value) return true
    
    connecting.value = true
    error.value = null
    
    try {
      // 获取token并验证有效性
      const token = userStore.token
      if (!token) {
        throw new Error('未登录，无法建立WebSocket连接')
      }
      
      // 验证是否能获取用户信息，确保token有效
      const userData = userStore.userInfo
      if (!userData || !userData.id) {
        throw new Error('无法获取用户信息，token可能已过期')
      }
      
      // 等待连接完成
      await connectSocket(token)
      
      // 验证连接状态
      const socket = getSocket()
      if (!socket || !socket.connected) {
        throw new Error('WebSocket连接失败')
      }
      
      connected.value = true
      setupBaseListeners()
      return true
    } catch (err) {
      console.error('WebSocket连接失败:', err.message)
      error.value = err.message || 'WebSocket连接失败'
      connected.value = false
      
      // 清理任何可能的连接
      try {
        disconnectSocket()
      } catch (cleanupErr) {
        console.warn('清理WebSocket连接时出错:', cleanupErr)
      }
      
      return false
    } finally {
      connecting.value = false
    }
  }

  // 断开WebSocket连接
  const disconnect = () => {
    if (!connected.value) return
    
    // 移除所有监听器
    cleanupListeners()
    
    // 断开连接
    disconnectSocket()
    connected.value = false
    currentRoomId.value = null
  }

  // 重新连接
  const reconnect = async () => {
    disconnect()
    return await connect()
  }

  // 加入房间
  const joinRoom = (roomId) => {
    if (!connected.value) {
      error.value = 'WebSocket未连接，无法加入房间'
      return false
    }
    
    try {
      const socket = getSocket()
      socket.emit('joinRoom', { roomId })
      currentRoomId.value = roomId
      return true
    } catch (err) {
      error.value = err.message || '加入房间失败'
      return false
    }
  }

  // 离开房间
  const leaveRoom = () => {
    if (!connected.value || !currentRoomId.value) return true
    
    try {
      const socket = getSocket()
      socket.emit('leaveRoom', { roomId: currentRoomId.value })
      currentRoomId.value = null
      return true
    } catch (err) {
      error.value = err.message || '离开房间失败'
      return false
    }
  }

  // 注册事件监听
  const on = (event, callback) => {
    const socket = getSocket()
    if (!socket) return
    
    // 保存监听器引用，以便后续移除
    listeners.value[event] = callback
    socket.on(event, callback)
  }

  // 移除事件监听
  const off = (event) => {
    const socket = getSocket()
    if (!socket) return
    
    if (listeners.value[event]) {
      socket.off(event, listeners.value[event])
      delete listeners.value[event]
    }
  }

  // 发送消息
  const emit = (event, data) => {
    const socket = getSocket()
    if (!socket) {
      error.value = 'WebSocket未连接，无法发送消息'
      return false
    }
    
    try {
      socket.emit(event, data)
      return true
    } catch (err) {
      error.value = err.message || '发送消息失败'
      return false
    }
  }

  // 发送聊天消息
  const sendChatMessage = (message) => {
    if (!connected.value || !currentRoomId.value) {
      error.value = '未连接或未加入房间，无法发送消息'
      return false
    }
    
    return emit('chatMessage', { 
      roomId: currentRoomId.value,
      userId: userStore.userId,
      username: userStore.username,
      content: message,
      timestamp: new Date().toISOString()
    })
  }

  // 设置基础监听器
  const setupBaseListeners = () => {
    const socket = getSocket()
    if (!socket) return
    
    // 连接状态监听
    on('connect', () => {
      connected.value = true
      error.value = null
    })
    
    on('disconnect', () => {
      connected.value = false
      currentRoomId.value = null
    })
    
    on('error', (err) => {
      error.value = err.message || 'WebSocket错误'
    })
    
    on('reconnect', (attemptNumber) => {
      connected.value = true
      error.value = null
    })
    
    on('reconnect_error', (err) => {
      error.value = '重连失败: ' + (err.message || '')
    })
  }

  // 清理所有监听器
  const cleanupListeners = () => {
    const socket = getSocket()
    if (!socket) return
    
    Object.keys(listeners.value).forEach(event => {
      socket.off(event, listeners.value[event])
    })
    
    listeners.value = {}
  }

  return {
    // 状态
    connected,
    connecting,
    error,
    currentRoomId,
    
    // 计算属性
    isConnected,
    isInRoom,
    
    // 方法
    connect,
    disconnect,
    reconnect,
    joinRoom,
    leaveRoom,
    on,
    off,
    emit,
    sendChatMessage
  }
}) 